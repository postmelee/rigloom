import type { Frame, PlacementState, Point } from "./placement";
import type { Viewer } from "./viewer";
import { downloadJSON } from "./mapping-panel";
const defaultFrame = (): Frame => ({ up: "Y", turn: 0, scale: 1, floor: true });
export class RigPanel {
  readonly root = document.createElement("section");
  private source?: ArrayBuffer;
  private sha = "";
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
  ) {
    this.root.innerHTML = `<p id="rig-status" role="status">Open a model without a skin.</p><fieldset id="rig-controls" disabled>
<details><summary>Model frame</summary><label class="export-field">Up axis<select id="rig-up"><option>Y</option><option>Z</option><option>X</option></select></label><label class="export-field">Turn to face +Z<select id="rig-turn"><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select></label><label class="export-field">Meters per source unit<input id="rig-scale" type="number" min="0.000001" max="1000000" step="any" value="1"></label><label><input id="rig-floor" type="checkbox" checked> Place on floor</label><button id="rig-frame">Apply frame</button></details>
<label class="export-field">Joint<select id="rig-joint"></select></label><div class="rig-coordinates">${["X", "Y", "Z"].map((axis) => `<label>${axis}<input id="rig-${axis.toLowerCase()}" aria-label="Joint ${axis}" type="number" step="0.01"></label>`).join("")}</div>
<label><input id="rig-symmetry" type="checkbox" checked> Mirror left / right</label><label><input id="rig-translucent" type="checkbox" checked> Translucent model</label>
<div class="button-row"><button id="rig-undo">Undo</button><button id="rig-redo">Redo</button></div><div class="button-row"><button id="rig-reset-joint">Reset joint</button><button id="rig-reset-all">Reset all</button></div>
<button id="rig-validate">Validate joints</button><div class="button-row"><button id="rig-save">Save placement</button><label class="upload">Load placement<input id="rig-load" type="file" accept=".json" aria-label="Load placement"></label></div></fieldset><button id="rig-cancel" hidden>Cancel</button>`;
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
        this.prepare(parsed.frame, parsed.joints);
      } catch (e) {
        this.message(String(e));
      }
    };
    this.get("rig-cancel").onclick = () => {
      this.revision++;
      this.worker?.terminate();
      this.worker = undefined;
      this.busy(false);
      this.message("Cancelled. Placement retained.");
    };
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
      value || !this.state;
    this.get("rig-cancel").hidden = !value;
  }
  reset() {
    this.revision++;
    this.worker?.terminate();
    this.worker = undefined;
    this.source = undefined;
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
    if (this.sha === sha) return;
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
  private prepare(frame: Frame, joints?: Point[], commit = true) {
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
      this.invalidate();
      this.busy(false);
      this.draw();
      this.message(
        joints
          ? "Joint checks passed."
          : "Place joints inside the model. Check Front and Side.",
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
  private edit(index: number, p: Point) {
    if (!this.state || this.worker) return;
    if (!p.every(Number.isFinite)) {
      this.message("Coordinates must be finite numbers.");
      this.draw();
      return;
    }
    this.revision++;
    this.remember();
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
    if (!this.state || this.worker) return;
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
