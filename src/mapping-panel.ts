import type { Inspection, Mapping, MappingFile } from "./protocol";

/** Only presentation and saved-file shape checks; Rust owns mapping semantics. */
export class MappingPanel {
  readonly root = document.createElement("section");
  private report?: Inspection;
  private sha?: string;
  private draft: Mapping = {};
  private fields: HTMLFieldSetElement;
  private save: HTMLButtonElement;
  private validate: HTMLButtonElement;
  private load: HTMLInputElement;
  private status: HTMLElement;
  private message: HTMLElement;
  private epoch = 0;
  constructor(
    private onChange: () => void,
    private onValidate: (mapping: Mapping) => void,
  ) {
    this.root.innerHTML = `<details open><summary>Humanoid mapping</summary><p>Review suggested names, choose source nodes, then validate. Mapping never changes the model.</p><p id="mapping-status" aria-live="polite">Open a GLB to review its humanoid mapping.</p><p id="bind-status"></p><p id="mapping-message" role="alert"></p><fieldset id="mapping-fields" disabled><legend class="sr-only">Humanoid bone assignments</legend><div id="required-bones"></div><details><summary>Optional bones</summary><div id="optional-bones"></div></details><button id="validate-mapping" type="button">Validate mapping</button><button id="save-mapping" type="button">Save mapping</button><label class="upload mapping-upload">Load mapping<input id="load-mapping" type="file" accept=".json,application/json" aria-label="Load mapping"></label></fieldset><p>Mapping files contain choices for this exact GLB. They are not an editable project or a VRM export.</p></details>`;
    const get = <T extends HTMLElement>(id: string) =>
      this.root.querySelector<T>(`#${id}`)!;
    this.fields = get<HTMLFieldSetElement>("mapping-fields");
    this.save = get<HTMLButtonElement>("save-mapping");
    this.validate = get<HTMLButtonElement>("validate-mapping");
    this.load = get<HTMLInputElement>("load-mapping");
    this.status = get("mapping-status");
    this.message = get("mapping-message");
    this.validate.onclick = () => this.onValidate({ ...this.draft });
    this.save.onclick = () => {
      if (!this.sha || this.save.disabled) return;
      downloadJSON(
        {
          schema_version: 1,
          source_sha256: this.sha,
          mapping: this.draft,
        } satisfies MappingFile,
        "rigloom-mapping.json",
      );
    };
    this.load.onchange = async () => {
      const file = this.load.files?.[0];
      this.load.value = "";
      if (!file || !this.report?.rig || !this.sha) return;
      const epoch = ++this.epoch;
      try {
        const value: unknown = JSON.parse(await file.text());
        if (epoch !== this.epoch) return;
        const mapping = parseMappingFile(
          value,
          this.sha,
          this.report.rig.mapping.bones.map((b) => b.bone),
        );
        this.draft = mapping;
        this.drawChoices();
        this.changed();
        this.message.textContent =
          "Mapping loaded. Validate to apply these choices.";
      } catch (error) {
        if (epoch === this.epoch)
          this.message.textContent = `Could not load mapping: ${error instanceof Error ? error.message : String(error)}`;
      }
    };
  }
  reset() {
    this.epoch++;
    this.report = undefined;
    this.sha = undefined;
    this.draft = {};
    this.fields.disabled = true;
    this.root.querySelector("#required-bones")!.replaceChildren();
    this.root.querySelector("#optional-bones")!.replaceChildren();
    this.status.textContent = "Open a GLB to review its humanoid mapping.";
    this.root.querySelector("#bind-status")!.textContent = "";
    this.message.textContent = "";
  }
  busy(message = "Validating mapping and existing skin…") {
    this.epoch++;
    this.fields.disabled = true;
    this.save.disabled = true;
    this.status.textContent = message;
  }
  show(report: Inspection, sha: string) {
    this.epoch++;
    this.report = report;
    this.sha = sha;
    this.fields.disabled = !report.rig;
    this.save.disabled = !report.rig;
    this.message.textContent = "";
    const rig = report.rig;
    if (!rig) {
      this.status.textContent =
        "Mapping unavailable. Resolve the structural diagnostics first.";
      this.root.querySelector("#bind-status")!.textContent =
        "Bind/weight checks not run.";
      return;
    }
    this.draft = Object.fromEntries(
      rig.mapping.bones.map((b) => [b.bone, b.node]),
    );
    this.drawChoices();
    this.status.textContent = rig.mapping.valid
      ? "Mapping valid. Review the chosen nodes before conversion."
      : "Mapping needs attention. Resolve the diagnostics below.";
    this.root.querySelector("#bind-status")!.textContent =
      report.inventory.skins === 0
        ? "No existing skin to validate."
        : rig.binds.valid
          ? "Bind/weight checks passed. Review warnings; deformation quality is not certified."
          : "Bind/weight checks failed. Source data remains unchanged.";
  }
  private changed() {
    this.epoch++;
    this.save.disabled = true;
    this.status.textContent = "Mapping changed. Validate to apply.";
    this.message.textContent = "";
    this.onChange();
  }
  private drawChoices() {
    const report = this.report;
    if (!report?.rig) return;
    const required = this.root.querySelector("#required-bones")!,
      optional = this.root.querySelector("#optional-bones")!;
    required.replaceChildren();
    optional.replaceChildren();
    for (const bone of report.rig.mapping.bones) {
      const label = document.createElement("label"),
        name = document.createElement("span"),
        select = document.createElement("select");
      label.className = "bone-choice";
      name.textContent = bone.bone + (bone.required ? " *" : "");
      select.setAttribute("aria-label", `Bone ${bone.bone}`);
      select.add(new Option("Unassigned", ""));
      for (const node of report.nodes)
        select.add(
          new Option(
            `${node.index}: ${node.name ?? "Unnamed"}`,
            String(node.index),
          ),
        );
      const choice = this.draft[bone.bone];
      if (choice !== null && !report.nodes.some((n) => n.index === choice))
        select.add(new Option(`${choice}: Invalid node`, String(choice)));
      select.value = choice === null ? "" : String(choice);
      select.onchange = () => {
        this.draft[bone.bone] =
          select.value === "" ? null : Number(select.value);
        this.changed();
      };
      label.append(name, select);
      if (bone.candidates.length > 1 && choice === null) {
        const hint = document.createElement("small");
        hint.textContent = `Multiple name matches: ${bone.candidates.join(", ")}. Choose a node.`;
        label.append(hint);
      }
      (bone.required ? required : optional).append(label);
    }
  }
}

function parseMappingFile(
  value: unknown,
  sha: string,
  bones: string[],
): Mapping {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a mapping object.");
  const data = value as Partial<MappingFile>;
  if (
    data.schema_version !== 1 ||
    typeof data.source_sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(data.source_sha256)
  )
    throw new Error("Unsupported mapping schema or source identity.");
  if (data.source_sha256 !== sha)
    throw new Error("Mapping belongs to a different GLB.");
  const mapping = data.mapping;
  if (
    !mapping ||
    typeof mapping !== "object" ||
    Array.isArray(mapping) ||
    Object.keys(mapping).length !== bones.length ||
    Object.keys(mapping).some((key) => !bones.includes(key))
  )
    throw new Error("Mapping must contain each supported bone exactly once.");
  for (const bone of bones) {
    const node = mapping[bone];
    if (
      node !== null &&
      (typeof node !== "number" ||
        !Number.isSafeInteger(node) ||
        node < 0 ||
        node > 0xffffffff)
    )
      throw new Error(`Invalid node choice for ${bone}.`);
  }
  return Object.fromEntries(bones.map((bone) => [bone, mapping[bone]]));
}
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
