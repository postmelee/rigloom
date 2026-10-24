import type { ConversionReport, ExportRequest, Inspection } from "./protocol";
import { downloadJSON } from "./mapping-panel";
type ExportSettings = Omit<ExportRequest, "mapping">;

/** Presents explicit choices. Rust rechecks eligibility and owns serialization. */
export class ExportPanel {
  readonly root = document.createElement("section");
  private form: HTMLFormElement;
  private fields: HTMLFieldSetElement;
  private submit: HTMLButtonElement;
  private status: HTMLElement;
  private saveVrm: HTMLButtonElement;
  private saveReport: HTMLButtonElement;
  private bytes?: ArrayBuffer;
  private report?: ConversionReport;
  private eligible = false;
  constructor(private onExport: (settings: ExportSettings) => void) {
    this.root.innerHTML = `<details open><summary>VRM 1.0 export</summary><p>Export the reviewed existing rig with its PBR materials and original skin data. Choose the model's usage terms explicitly.</p><p id="export-status" aria-live="polite">Open and validate a rigged GLB to prepare an export.</p><form id="export-form"><fieldset id="export-fields" disabled><legend class="sr-only">VRM model information and usage permissions</legend>
<label class="export-field">Avatar name<input id="avatar-name" required autocomplete="off"></label>
<label class="export-field">Authors (one per line)<textarea id="avatar-authors" required rows="2"></textarea></label>
<label class="export-field">Version<input id="avatar-version" autocomplete="off"></label>
<div id="permission-fields"></div>
<p>The export uses the <a href="https://vrm.dev/licenses/1.0/" target="_blank" rel="noreferrer">VRM Public License 1.0</a> with the choices above. Conversion does not grant rights to a model.</p>
<label class="export-confirm"><input id="rights-confirmed" type="checkbox" required>I can set these usage permissions</label>
<label class="export-confirm"><input id="pose-confirmed" type="checkbox" required>Source is a T-pose humanoid facing +Z, Y-up, in meters</label>
<label class="export-confirm" id="bind-confirmation" hidden><input id="bind-confirmed" type="checkbox">I reviewed the bind-pose warning</label>
<p>Geometry and transforms are not reoriented. Expressions, gaze and physics are not generated. Source animations and cameras are retained but are not VRM avatar behavior.</p>
<button type="submit" id="export-vrm" disabled>Export VRM 1.0</button></fieldset></form>
<button id="save-vrm" disabled>Save VRM</button><button id="save-conversion" disabled>Save conversion report</button><ul id="export-diagnostics" class="diagnostic-list"></ul><ul id="export-summary"></ul></details>`;
    const get = <T extends HTMLElement>(id: string) =>
      this.root.querySelector<T>(`#${id}`)!;
    this.form = get<HTMLFormElement>("export-form");
    this.fields = get<HTMLFieldSetElement>("export-fields");
    this.submit = get<HTMLButtonElement>("export-vrm");
    this.status = get("export-status");
    this.saveVrm = get<HTMLButtonElement>("save-vrm");
    this.saveReport = get<HTMLButtonElement>("save-conversion");
    const addSelect = (
      id: string,
      title: string,
      options: [string, string][],
    ) => {
      const label = document.createElement("label"),
        select = document.createElement("select");
      label.className = "export-field";
      label.append(document.createTextNode(title));
      select.id = id;
      select.setAttribute("aria-label", title);
      select.required = true;
      select.add(new Option("Choose…", ""));
      for (const [value, text] of options) select.add(new Option(text, value));
      label.append(select);
      get("permission-fields").append(label);
    };
    addSelect("avatar-permission", "Avatar permission", [
      ["onlyAuthor", "Only the author"],
      ["onlySeparatelyLicensedPerson", "Separately licensed people"],
      ["everyone", "Everyone"],
    ]);
    addSelect("commercial-usage", "Commercial usage", [
      ["personalNonProfit", "Personal non-profit only"],
      ["personalProfit", "Personal profit allowed"],
      ["corporation", "Corporate use allowed"],
    ]);
    addSelect("credit-notation", "Credit notation", [
      ["required", "Required"],
      ["unnecessary", "Not required"],
    ]);
    addSelect("modification", "Modification", [
      ["prohibited", "Prohibited"],
      ["allowModification", "Modification allowed"],
      [
        "allowModificationRedistribution",
        "Modification and redistribution allowed",
      ],
    ]);
    for (const [id, title] of [
      ["violent-usage", "Violent usage"],
      ["sexual-usage", "Sexual usage"],
      ["political-usage", "Political or religious usage"],
      ["hate-usage", "Antisocial or hate usage"],
      ["redistribution", "Redistribution"],
    ])
      addSelect(id, title, [
        ["false", "Not allowed"],
        ["true", "Allowed"],
      ]);
    const value = (id: string) =>
      get<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id).value;
    this.form.onsubmit = (event) => {
      event.preventDefault();
      if (!this.eligible || !this.form.reportValidity()) return;
      const version = value("avatar-version").trim();
      this.onExport({
        meta: {
          name: value("avatar-name").trim(),
          authors: value("avatar-authors")
            .split(/\r?\n/)
            .map((author) => author.trim())
            .filter(Boolean),
          ...(version ? { version } : {}),
          avatarPermission: value("avatar-permission"),
          commercialUsage: value("commercial-usage"),
          creditNotation: value("credit-notation"),
          modification: value("modification"),
          allowExcessivelyViolentUsage: value("violent-usage") === "true",
          allowExcessivelySexualUsage: value("sexual-usage") === "true",
          allowPoliticalOrReligiousUsage: value("political-usage") === "true",
          allowAntisocialOrHateUsage: value("hate-usage") === "true",
          allowRedistribution: value("redistribution") === "true",
        },
        rights_confirmed: get<HTMLInputElement>("rights-confirmed").checked,
        source_pose_confirmed: get<HTMLInputElement>("pose-confirmed").checked,
        acknowledge_bind_warning:
          get<HTMLInputElement>("bind-confirmed").checked,
      });
    };
    this.form.oninput = () =>
      this.invalidate(
        "Export settings changed. Export again to prepare new files.",
      );
    this.form.onchange = () =>
      this.invalidate(
        "Export settings changed. Export again to prepare new files.",
      );
    this.saveVrm.onclick = () => {
      if (!this.bytes) return;
      const url = URL.createObjectURL(
        new Blob([this.bytes], { type: "model/gltf-binary" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "rigloom-avatar.vrm";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    this.saveReport.onclick = () => {
      if (this.report) downloadJSON(this.report, "rigloom-conversion.json");
    };
  }
  private invalidate(message: string) {
    this.bytes = undefined;
    this.report = undefined;
    this.saveVrm.disabled = true;
    this.saveReport.disabled = true;
    this.root.querySelector("#export-diagnostics")!.replaceChildren();
    this.root.querySelector("#export-summary")!.replaceChildren();
    this.status.textContent = message;
  }
  reset() {
    this.form.reset();
    this.fields.disabled = true;
    this.submit.disabled = true;
    this.eligible = false;
    this.root.querySelector<HTMLElement>("#bind-confirmation")!.hidden = true;
    this.invalidate("Open and validate a rigged GLB to prepare an export.");
  }
  waitForMapping() {
    this.eligible = false;
    this.submit.disabled = true;
    this.invalidate("Validate the current humanoid mapping before export.");
  }
  inspecting() {
    this.waitForMapping();
    this.fields.disabled = true;
  }
  setSource(report: Inspection) {
    this.fields.disabled = false;
    this.eligible =
      !!report.rig?.mapping.valid &&
      !!report.rig?.binds.valid &&
      report.inventory.skins > 0 &&
      !report.diagnostics.some((d) => d.severity === "error");
    this.submit.disabled = !this.eligible;
    this.root.querySelector<HTMLElement>("#bind-confirmation")!.hidden =
      !report.rig?.binds.diagnostics.some((d) => d.code === "bind_rest_review");
    this.invalidate(
      this.eligible
        ? "Ready for model information and explicit usage choices."
        : "Resolve mapping and skin errors before export.",
    );
  }
  busy() {
    this.invalidate("Exporting VRM in Rust…");
    this.fields.disabled = true;
  }
  complete(report: ConversionReport, bytes: ArrayBuffer | null) {
    this.fields.disabled = false;
    this.submit.disabled = !this.eligible;
    this.report = report;
    this.bytes = report.export_allowed && bytes ? bytes : undefined;
    this.saveVrm.disabled = !this.bytes;
    this.saveReport.disabled = false;
    this.status.textContent = this.bytes
      ? "VRM ready. Save the model and conversion report."
      : "Export blocked. Review the diagnostics below.";
    const list = this.root.querySelector("#export-diagnostics")!;
    list.replaceChildren();
    for (const diagnostic of report.diagnostics) {
      const li = document.createElement("li");
      li.className = diagnostic.severity;
      const code = document.createElement("strong"),
        text = document.createElement("p"),
        path = document.createElement("code");
      code.textContent = diagnostic.code;
      text.textContent = `${diagnostic.message} ${diagnostic.remedy}`;
      path.textContent = diagnostic.path;
      li.append(code, text, path);
      list.append(li);
    }
    const summary = this.root.querySelector("#export-summary")!;
    summary.replaceChildren();
    for (const text of [
      ...report.changes,
      ...report.preserved,
      ...report.limitations,
    ]) {
      const item = document.createElement("li");
      item.textContent = text;
      summary.append(item);
    }
  }
  failed(message: string) {
    this.fields.disabled = false;
    this.submit.disabled = !this.eligible;
    this.invalidate(message);
  }
}
