import { bindRigShortcuts } from "./rig-shortcuts";
import type { Frame, PlacementState, Point } from "./placement";
import type { Mapping } from "./protocol";
import type { Viewer } from "./viewer";
import { downloadJSON } from "./mapping-panel";
const defaultFrame = (): Frame => ({ up: "Y", turn: 0, scale: 1, floor: true });
export class RigPanel {
  readonly root = document.createElement("section");
  private source?: ArrayBuffer;
  private sha = "";
  private generated?: {
    bytes: ArrayBuffer;
    report: {
      mapping: Mapping;
      vertices: number;
      algorithm: string;
      max_weight_sum_error: number;
      [key: string]: unknown;
    };
  };
  private preview = false;
  private parts: { id: string; label: string; vertices: number }[] = [];
  private rigid: Record<string, number> = {};
  private skinError?: string;
  private revision = 0;
  private worker?: Worker;
  state?: PlacementState;
  private past: PlacementState[] = [];
  private future: PlacementState[] = [];
  private selected = 0;
  private get<T extends HTMLElement = HTMLElement>(id: string) {
    return this.root.querySelector<T>(`#${id}`)!;
  }
  constructor(
    private viewer: Viewer | undefined,
    private invalidate: () => void,
    private adopt: (bytes: ArrayBuffer, mapping: Mapping) => Promise<boolean>,
  ) {
    this.root.innerHTML = `<p id="rig-status" role="status">Open a model without a skin.</p><fieldset id="rig-controls" disabled>
<details><summary>Model frame</summary><label class="export-field">Up axis<select id="rig-up"><option>Y</option><option>Z</option><option>X</option></select></label><label class="export-field">Turn to face +Z<select id="rig-turn"><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select></label><label class="export-field">Meters per source unit<input id="rig-scale" type="number" min="0.000001" max="1000000" step="any" value="1"></label><label><input id="rig-floor" type="checkbox" checked> Place on floor</label><button id="rig-frame">Apply frame</button></details>
<label class="export-field">Joint<select id="rig-joint"></select></label><div class="rig-coordinates">${["X", "Y", "Z"].map((axis) => `<label>${axis}<input id="rig-${axis.toLowerCase()}" aria-label="Joint ${axis}" type="number" step="0.01"></label>`).join("")}</div>
<label><input id="rig-symmetry" type="checkbox" checked> Mirror left / right</label><label><input id="rig-translucent" type="checkbox" checked> Translucent model</label>
<div class="button-row"><button id="rig-undo" aria-keyshortcuts="Meta+Z Control+Z">Undo</button><button id="rig-redo" aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z Control+Y">Redo</button></div><div class="button-row"><button id="rig-reset-joint">Reset joint</button><button id="rig-reset-all">Reset all</button></div>
<details><summary>Keyboard shortcuts</summary><p>Click the model first. World axes: ←/→ X · ↑/↓ Y · Alt+↑/↓ Z. Shift: ⅒ step.</p><label class="export-field">Move step<select id="rig-move-step" aria-label="Move step"><option value="0.001">1 mm</option><option value="0.01" selected>1 cm</option><option value="0.1">10 cm</option></select></label><p>⌘/Ctrl+Z: undo · +Shift: redo. [ / ]: joint. 1 / 2 / 3: Front / Side / Free.</p><button id="rig-focus">Focus model</button></details>
<button id="rig-validate">Validate joints</button><div class="button-row"><button id="rig-save">Save placement</button><label class="upload">Load placement<input id="rig-load" type="file" accept=".json" aria-label="Load placement"></label></div><details><summary>Initial weights</summary><label class="export-field">Method<select id="rig-method" aria-label="Method"><option value="surface">Surface smoothing (experimental)</option><option value="segment">Segment distance (baseline)</option></select></label><label class="export-field">Component<select id="rig-part" aria-label="Component"></select></label><label class="export-field">Attachment<select id="rig-attachment" aria-label="Attachment"><option value="">Deform</option></select></label></details>
<button id="rig-generate">Generate weights</button></fieldset><button id="rig-cancel" hidden>Cancel</button>
<fieldset id="rig-preview" hidden><p>Initial weights. Check bends before export.</p><label class="export-field">Bend<select id="rig-bend" aria-label="Bend"><option value="leftLowerArm">Left elbow</option><option value="rightLowerArm">Right elbow</option><option value="leftLowerLeg">Left knee</option><option value="rightLowerLeg">Right knee</option></select></label><label class="export-field">Angle<input id="rig-angle" aria-label="Angle" type="range" min="0" max="120" value="0"><output id="rig-angle-value">0°</output></label><button id="rig-edit">Edit joints</button><div class="button-row"><button id="rig-download">Save rigged GLB</button><button id="rig-weight-report">Save weight report</button></div></fieldset>`;
    this.get("rig-generate").onclick = () => this.generate();
    this.get("rig-edit").onclick = () => void this.returnToEdit();
    const bend = () => {
      const angle = this.get<HTMLInputElement>("rig-angle").valueAsNumber;
      const bone = this.get<HTMLSelectElement>("rig-bend").value;
      this.get("rig-angle-value").textContent = `${angle}°`;
      this.viewer?.pose(
        this.generated?.report.mapping[bone] ?? null,
        bone.includes("Arm") ? "z" : "x",
        ((angle * Math.PI) / 180) * (bone === "leftLowerArm" ? -1 : 1),
      );
    };
    this.get("rig-bend").onchange = bend;
    this.get("rig-angle").oninput = bend;
    this.get("rig-download").onclick = () => {
      if (!this.generated) return;
      const url = URL.createObjectURL(
        new Blob([this.generated.bytes], { type: "model/gltf-binary" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "rigloom-rigged.glb";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    this.get("rig-weight-report").onclick = () => {
      if (this.generated)
        downloadJSON(
          {
            schema_version: 1,
            source_sha256: this.sha,
            frame: this.state?.frame,
            joints: this.state?.data.joints,
            ...this.generated.report,
          },
          "rigloom-weights.json",
        );
    };
    this.get("rig-part").onchange = () => {
      const id = this.get<HTMLSelectElement>("rig-part").value;
      this.get<HTMLSelectElement>("rig-attachment").value =
        this.rigid[id] === undefined ? "" : String(this.rigid[id]);
    };
    this.get("rig-attachment").onchange = () => {
      const id = this.get<HTMLSelectElement>("rig-part").value,
        value = this.get<HTMLSelectElement>("rig-attachment").value;
      if (value === "") delete this.rigid[id];
      else this.rigid[id] = Number(value);
      this.revision++;
      this.invalidate();
    };
    this.get("rig-method").onchange = () => {
      this.revision++;
      this.invalidate();
    };
    this.get("rig-frame").onclick = () => {
      const frame = {
        up: this.get<HTMLSelectElement>("rig-up").value,
        turn: Number(this.get<HTMLSelectElement>("rig-turn").value),
        scale: this.get<HTMLInputElement>("rig-scale").valueAsNumber,
        floor: this.get<HTMLInputElement>("rig-floor").checked,
      };
      this.prepare(frame);
    };
    this.get<HTMLSelectElement>("rig-joint").onchange = () => {
      this.selected = Number(this.get<HTMLSelectElement>("rig-joint").value);
      this.draw();
    };
    for (const axis of ["x", "y", "z"])
      this.get<HTMLInputElement>(`rig-${axis}`).onchange = () =>
        this.edit(
          this.selected,
          ["x", "y", "z"].map(
            (a) => this.get<HTMLInputElement>(`rig-${a}`).valueAsNumber,
          ) as Point,
        );
    this.get("rig-translucent").onchange = () => this.draw();
    this.get("rig-undo").onclick = () => this.history(false);
    this.get("rig-redo").onclick = () => this.history(true);
    this.get("rig-reset-joint").onclick = () => {
      if (this.state)
        this.edit(this.selected, this.state.data.defaults[this.selected]);
    };
    this.get("rig-reset-all").onclick = () => this.prepare(defaultFrame());
    this.get("rig-validate").onclick = () => {
      if (this.state)
        this.prepare(this.state.frame, this.state.data.joints, false);
    };
    this.get("rig-save").onclick = () => {
      if (this.state)
        downloadJSON(
          {
            schema_version: 1,
            source_sha256: this.sha,
            frame: this.state.frame,
            joints: this.state.data.joints,
            method: this.get<HTMLSelectElement>("rig-method").value,
            rigid: this.rigid,
          },
          "rigloom-placement.json",
        );
    };
    this.get<HTMLInputElement>("rig-load").onchange = async (event) => {
      const input = event.target as HTMLInputElement,
        file = input.files?.[0],
        revision = this.revision;
      input.value = "";
      if (!file) return;
      try {
        if (file.size > 100000) throw new Error("Placement file is too large.");
        const parsed = JSON.parse(await file.text());
        if (revision !== this.revision) return;
        if (parsed.schema_version !== 1 || parsed.source_sha256 !== this.sha)
          throw new Error(
            "Placement belongs to a different source GLB or version.",
          );
        if (
          parsed.method !== undefined &&
          !["surface", "segment"].includes(parsed.method)
        )
          throw new Error("Unknown weight method.");
        if (
          parsed.rigid !== undefined &&
          (typeof parsed.rigid !== "object" ||
            parsed.rigid === null ||
            Array.isArray(parsed.rigid) ||
            Object.entries(parsed.rigid).some(
              ([id, bone]) =>
                !this.parts.some((p) => p.id === id) ||
                !Number.isInteger(bone) ||
                Number(bone) < 0 ||
                Number(bone) >= 15,
            ))
        )
          throw new Error("Invalid component attachment.");
        this.prepare(parsed.frame, parsed.joints, true, {
          method: parsed.method ?? "surface",
          rigid: parsed.rigid ?? {},
        });
      } catch (e) {
        this.message(String(e));
      }
    };
    this.get("rig-cancel").onclick = () => {
      this.revision++;
      this.worker?.terminate();
      this.worker = undefined;
      this.invalidate();
      this.generated = undefined;
      this.preview = false;
      this.get("rig-preview").hidden = true;
      this.busy(false);
      if (this.source) void this.restoreSource();
      this.message("Cancelled. Placement retained.");
    };
    const canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
    this.get("rig-focus").onclick = () => canvas.focus();
    bindRigShortcuts({
      root: this.root,
      canvas,
      enabled: () =>
        !this.root.hidden &&
        !!this.state &&
        !this.get<HTMLFieldSetElement>("rig-controls").disabled &&
        !viewer?.placement.dragging,
      history: (redo) => this.history(redo),
      step: () => Number(this.get<HTMLSelectElement>("rig-move-step").value),
      move: (axis, amount, record) => {
        if (!this.state) return;
        const p: Point = [...this.state.data.joints[this.selected]];
        p[axis] += amount;
        this.edit(this.selected, p, record);
      },
      select: (direction) => {
        if (!this.state) return;
        this.selected =
          (this.selected + direction + this.state.data.joints.length) %
          this.state.data.joints.length;
        this.draw();
      },
      view: (mode) => viewer?.view(mode),
    });
    if (viewer) {
      viewer.placement.onSelect = (index) => {
        this.selected = index;
        this.draw();
      };
      viewer.placement.onEdit = (index, p) => this.edit(index, p);
    }
  }
  private message(text: string) {
    this.get("rig-status").textContent = text;
  }
  private busy(value: boolean) {
    this.get<HTMLFieldSetElement>("rig-controls").disabled =
      value || !this.state || this.preview;
    this.get<HTMLButtonElement>("rig-generate").disabled = !!this.skinError;
    this.viewer?.placement.show(
      value || this.preview ? null : (this.state?.data ?? null),
      this.selected,
    );
    this.get("rig-cancel").hidden = !value;
    this.get("rig-controls").hidden = this.preview;
  }
  reset() {
    this.revision++;
    this.worker?.terminate();
    this.worker = undefined;
    this.source = undefined;
    this.generated = undefined;
    this.preview = false;
    this.parts = [];
    this.get<HTMLSelectElement>("rig-method").value = "surface";
    this.rigid = {};
    this.skinError = undefined;
    this.get("rig-preview").hidden = true;
    this.sha = "";
    this.state = undefined;
    this.past = [];
    this.future = [];
    this.selected = 0;
    this.viewer?.setPlacement(null);
    this.busy(false);
    this.message("Open a model without a skin.");
  }
  load(bytes: ArrayBuffer, sha: string) {
    if (this.sha === sha) {
      if (!this.preview) this.draw();
      return;
    }
    this.reset();
    this.source = bytes.slice(0);
    this.sha = sha;
    this.prepare(defaultFrame());
  }
  private remember() {
    if (this.state) this.past.push(structuredClone(this.state));
    if (this.past.length > 100) this.past.shift();
    this.future = [];
  }
  private prepare(
    frame: Frame,
    joints?: Point[],
    commit = true,
    settings?: { method: string; rigid: Record<string, number> },
  ) {
    if (!this.source) return;
    this.revision++;
    const revision = this.revision;
    this.worker?.terminate();
    this.busy(true);
    this.message("Preparing joints…");
    const worker = (this.worker = new Worker(
      new URL("./rig.worker.ts", import.meta.url),
      { type: "module" },
    ));
    worker.onmessage = ({ data }) => {
      if (data.revision !== this.revision) return;
      worker.terminate();
      this.worker = undefined;
      if (data.error) {
        this.busy(false);
        this.message(data.error);
        return;
      }
      if (commit) this.remember();
      this.state = { frame, data: data.placement };
      this.parts = data.parts;
      this.skinError = data.skinError;
      if (settings) {
        this.rigid = settings.rigid;
        this.get<HTMLSelectElement>("rig-method").value = settings.method;
      }
      this.get<HTMLSelectElement>("rig-part").replaceChildren(
        ...this.parts.map(
          (p) => new Option(`${p.label} · ${p.vertices} vertices`, p.id),
        ),
      );
      this.get<HTMLSelectElement>("rig-attachment").replaceChildren(
        new Option("Deform", ""),
        ...this.state!.data.names.map(
          (n, i) => new Option(`Rigid: ${n}`, String(i)),
        ),
      );
      const part = this.get<HTMLSelectElement>("rig-part").value;
      this.get<HTMLSelectElement>("rig-attachment").value =
        this.rigid[part] === undefined ? "" : String(this.rigid[part]);
      this.invalidate();
      this.busy(false);
      this.draw();
      this.message(
        joints
          ? "Joint checks passed."
          : "Place joints inside the model. Check Front and Side." +
              (this.skinError ? ` ${this.skinError}` : ""),
      );
      this.viewer?.view("front");
    };
    worker.onerror = () => {
      if (revision !== this.revision) return;
      worker.terminate();
      this.worker = undefined;
      this.busy(false);
      this.message("Joint preparation failed. Try again.");
    };
    const bytes = this.source.slice(0);
    worker.postMessage({ revision, bytes, frame, joints }, [bytes]);
  }
  private edit(index: number, p: Point, record = true) {
    if (!this.state || this.worker || this.preview) return;
    if (!p.every(Number.isFinite)) {
      this.message("Coordinates must be finite numbers.");
      this.draw();
      return;
    }
    this.revision++;
    if (record) this.remember();
    this.state.data.joints[index] = [...p];
    if (this.get<HTMLInputElement>("rig-symmetry").checked) {
      const pair = [
        [3, 6],
        [4, 7],
        [5, 8],
        [9, 12],
        [10, 13],
        [11, 14],
      ].find((v) => v.includes(index));
      if (pair)
        this.state.data.joints[pair.find((v) => v !== index)!] = [
          -p[0],
          p[1],
          p[2],
        ];
    }
    this.invalidate();
    this.draw();
    this.message("Placement changed. Validate before generating weights.");
  }
  private history(redo: boolean) {
    if (!this.state || this.worker || this.preview) return;
    const from = redo ? this.future : this.past,
      to = redo ? this.past : this.future,
      next = from.pop();
    if (!next) return;
    this.revision++;
    to.push(structuredClone(this.state));
    this.state = next;
    this.invalidate();
    this.draw();
    this.message("Placement changed.");
  }
  private async restoreSource() {
    if (!this.source) return;
    const revision = this.revision;
    this.busy(true);
    try {
      await this.viewer?.load(this.source.slice(0));
      if (revision !== this.revision) return;
      this.busy(false);
      this.draw();
      this.viewer?.view("front");
    } catch (error) {
      if (revision === this.revision) {
        this.busy(false);
        this.message(`Preview failed: ${String(error)}`);
      }
    }
  }
  private async returnToEdit() {
    this.revision++;
    this.worker?.terminate();
    this.worker = undefined;
    this.preview = false;
    this.generated = undefined;
    this.get("rig-preview").hidden = true;
    this.invalidate();
    const revision = this.revision;
    await this.restoreSource();
    if (revision === this.revision)
      this.message("Edit mode. Generate weights again after edits.");
  }
  private generate() {
    if (
      !this.source ||
      !this.state ||
      this.worker ||
      this.preview ||
      this.skinError
    )
      return;
    this.revision++;
    const revision = this.revision;
    this.invalidate();
    this.busy(true);
    this.message("Validating joints and preparing weights…");
    const worker = (this.worker = new Worker(
      new URL("./rig.worker.ts", import.meta.url),
      { type: "module" },
    ));
    const fail = (message: string) => {
      if (revision !== this.revision) return;
      worker.terminate();
      this.worker = undefined;
      this.generated = undefined;
      this.preview = false;
      this.invalidate();
      this.busy(false);
      this.draw();
      this.message(message);
    };
    worker.onerror = () =>
      fail("Weight worker failed. Reduce the model and try again.");
    worker.onmessage = async ({ data }) => {
      if (revision !== this.revision) return;
      if (data.phase) {
        this.message("Computing weights and checking binds…");
        return;
      }
      if (data.error) {
        fail(data.error);
        return;
      }
      worker.terminate();
      this.worker = undefined;
      this.generated = { bytes: data.bytes, report: data.report };
      this.message("Loading generated rig…");
      try {
        const ready = await this.adopt(
          data.bytes.slice(0),
          data.report.mapping,
        );
        if (revision !== this.revision) return;
        if (!ready) {
          fail("Generated rig could not be loaded. Try again.");
          await this.restoreSource();
          return;
        }
        this.preview = true;
        this.busy(false);
        this.get("rig-preview").hidden = false;
        this.get<HTMLInputElement>("rig-angle").value = "0";
        this.get("rig-angle-value").textContent = "0°";
        this.message(
          `Preview · ${data.report.vertices} vertices · weights checked. Review deformation.`,
        );
      } catch (error) {
        fail(String(error));
        await this.restoreSource();
      }
    };
    const bytes = this.source.slice(0);
    worker.postMessage(
      {
        operation: "skin",
        revision,
        bytes,
        request: {
          frame: this.state.frame,
          joints: this.state.data.joints,
          method: this.get<HTMLSelectElement>("rig-method").value,
          rigid: this.rigid,
        },
      },
      [bytes],
    );
  }
  private draw() {
    if (!this.state) return;
    const { frame, data } = this.state;
    const select = this.get<HTMLSelectElement>("rig-joint");
    select.replaceChildren(
      ...data.names.map((name, index) => new Option(name, String(index))),
    );
    select.value = String(this.selected);
    ["x", "y", "z"].forEach(
      (axis, i) =>
        (this.get<HTMLInputElement>(`rig-${axis}`).value = String(
          Number(data.joints[this.selected][i].toFixed(6)),
        )),
    );
    this.get<HTMLSelectElement>("rig-up").value = frame.up;
    this.get<HTMLSelectElement>("rig-turn").value = String(frame.turn);
    this.get<HTMLInputElement>("rig-scale").value = String(frame.scale);
    this.get<HTMLInputElement>("rig-floor").checked = frame.floor;
    this.get<HTMLButtonElement>("rig-undo").disabled = !this.past.length;
    this.get<HTMLButtonElement>("rig-redo").disabled = !this.future.length;
    this.viewer?.setPlacement(
      data,
      this.selected,
      this.get<HTMLInputElement>("rig-translucent").checked,
    );
  }
}
