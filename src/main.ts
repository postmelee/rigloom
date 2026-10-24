import {
  createIcons,
  Upload,
  X,
  SunMoon,
  Download,
  Box,
  ScanLine,
} from "lucide";
import { Viewer } from "./viewer";
import type {
  ExportRequest,
  ExportWorkerReply,
  Inspection,
  Mapping,
  WorkerReply,
} from "./protocol";
import { ExportPanel } from "./export-panel";
import { MappingPanel, downloadJSON } from "./mapping-panel";
import "./style.css";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<header><a class="brand" href="./"><i data-lucide="box"></i>Rigloom</a><span class="badge">M1 · local development</span><div class="spacer"></div><button id="theme" aria-label="Toggle light or dark theme"><i data-lucide="sun-moon"></i></button></header>
<main><aside><div class="eyebrow">CHARACTER WORKSPACE</div><h1>Inspect your model</h1><p>Start with a self-contained GLB. Review its structure before preparing a humanoid rig.</p><label class="upload"><i data-lucide="upload"></i>Open GLB<input id="file" type="file" accept=".glb" aria-label="Open GLB"></label><button id="cancel" disabled><i data-lucide="x"></i>Cancel inspection</button><ol class="steps"><li aria-current="step"><b>01</b> Inspect GLB <span>Available</span></li><li><b>02</b> Map humanoid <span>Available</span></li><li><b>03</b> Prepare skin <span>Planned</span></li><li><b>04</b> Export VRM <span>Available</span></li></ol><div class="note">Mapping and bind checks do not certify deformation quality or VRM validity. Joint editing and weight generation are not available yet.</div><a href="https://github.com/postmelee/rigloom" target="_blank" rel="noreferrer">Project & documentation ↗</a></aside>
<section class="viewport" aria-label="3D model preview"><div class="view-tools"><button data-view="front">Front</button><button data-view="side">Side</button><button data-view="free">Free</button></div><canvas aria-label="Orbitable model canvas" tabindex="0"></canvas><div class="empty" id="empty"><i data-lucide="scan-line"></i><strong>Your model, ready for a closer look</strong><span>Open a GLB to inspect meshes, nodes and existing skins.</span></div><div class="view-hint">Drag to orbit · Scroll to zoom · Right-drag to pan</div></section>
<aside class="inspector"><div class="eyebrow">INSPECTION</div><h2 id="filename">No model selected</h2><p id="status" role="status" aria-live="polite">Waiting for a GLB file.</p><dl id="stats"></dl><button id="report" disabled><i data-lucide="download"></i>Save report</button><h3>Diagnostics</h3><ul id="diagnostics"><li>Model details will appear here.</li></ul><details><summary>Node hierarchy</summary><ul id="nodes"></ul></details></aside></main><footer>Local development · No public deployment <span>File processing runs in this browser. No upload service is configured.</span></footer>`;
createIcons({ icons: { Upload, X, SunMoon, Download, Box, ScanLine } });
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const status = el("status"),
  cancel = el<HTMLButtonElement>("cancel"),
  save = el<HTMLButtonElement>("report");
let viewer: Viewer | undefined;
try {
  viewer = new Viewer(document.querySelector("canvas")!);
} catch {
  status.textContent =
    "WebGL is unavailable. File inspection still works; enable WebGL to see the model.";
}
let worker: Worker | undefined,
  revision = 0,
  latest: Inspection | undefined,
  sourceBytes: ArrayBuffer | undefined,
  sourceSha: string | undefined;
const exportPanel = new ExportPanel((settings) => {
  if (!sourceBytes || !sourceSha || !latest?.rig) return;
  const mapping = Object.fromEntries(
    latest.rig.mapping.bones.map((bone) => [bone.bone, bone.node]),
  );
  startExport({ ...settings, mapping });
});
const mappingPanel = new MappingPanel(
  () => {
    latest = undefined;
    save.disabled = true;
    exportPanel.waitForMapping();
  },
  (mapping) => {
    if (!sourceBytes) return;
    revision++;
    worker?.terminate();
    runInspection(sourceBytes.slice(0), revision, mapping);
  },
);
el("report").after(mappingPanel.root);
mappingPanel.root.after(exportPanel.root);
const stop = () => {
  revision++;
  worker?.terminate();
  worker = undefined;
  cancel.disabled = true;
  sourceBytes = undefined;
  sourceSha = undefined;
  mappingPanel.reset();
  exportPanel.reset();
  viewer?.clear();
  el("empty").hidden = false;
};
const showReport = (report: Inspection) => {
  latest = report;
  save.disabled = false;
  el("stats").replaceChildren();
  for (const [label, key] of [
    ["Meshes", "meshes"],
    ["Mesh instances", "mesh_instances"],
    ["Vertices", "vertices"],
    ["Skins", "skins"],
    ["Joint references", "joints"],
    ["Animations", "animations"],
  ] as const) {
    const term = document.createElement("dt"),
      value = document.createElement("dd");
    term.textContent = label;
    value.textContent = String(report.inventory[key]);
    el("stats").append(term, value);
  }
  el("diagnostics").replaceChildren();
  for (const diagnostic of [
    ...report.diagnostics,
    ...(report.rig?.mapping.diagnostics ?? []),
    ...(report.rig?.binds.diagnostics ?? []),
  ]) {
    const item = document.createElement("li");
    item.className = diagnostic.severity;
    const title = document.createElement("strong"),
      body = document.createElement("p"),
      path = document.createElement("code");
    title.textContent = diagnostic.code;
    body.textContent = `${diagnostic.message} ${diagnostic.remedy}`;
    path.textContent = diagnostic.path;
    item.append(title, body, path);
    el("diagnostics").append(item);
  }
  el("nodes").replaceChildren();
  for (const node of report.nodes) {
    const item = document.createElement("li");
    item.textContent = `${node.index}: ${node.name ?? "Unnamed"} → [${node.children.join(", ")}]`;
    el("nodes").append(item);
  }
};
const runInspection = (
  bytes: ArrayBuffer,
  request: number,
  mapping?: Mapping,
) => {
  latest = undefined;
  save.disabled = true;
  cancel.disabled = false;
  mappingPanel.busy();
  exportPanel.inspecting();
  status.textContent = "Inspecting GLB in Rust…";
  try {
    worker = new Worker(new URL("./inspect.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onerror = () => {
      if (request !== revision) return;
      status.textContent =
        "Inspection worker failed. Reload the app and rebuild WASM if developing locally.";
      worker?.terminate();
      worker = undefined;
      cancel.disabled = true;
      mappingPanel.reset();
      exportPanel.reset();
    };
    worker.onmessage = async ({ data }: { data: WorkerReply }) => {
      if (data.revision !== revision) return;
      if (data.phase === "inspecting") {
        status.textContent = "Inspecting GLB in Rust…";
        return;
      }
      worker?.terminate();
      worker = undefined;
      if (data.phase === "error") {
        status.textContent = data.message;
        cancel.disabled = true;
        mappingPanel.reset();
        exportPanel.reset();
        return;
      }
      sourceBytes = data.bytes;
      sourceSha = data.source_sha256;
      showReport(data.report);
      mappingPanel.show(data.report, data.source_sha256);
      exportPanel.setSource(data.report);
      if (!data.report.preview_allowed) {
        viewer?.clear();
        el("empty").hidden = false;
        status.textContent = "Preview blocked. Resolve the diagnostics below.";
        cancel.disabled = true;
        return;
      }
      status.textContent = "Preparing preview…";
      try {
        if (viewer) {
          const loaded = await viewer.load(data.bytes);
          if (request !== revision || !loaded) return;
          el("empty").hidden = true;
        }
        if (request !== revision) return;
        status.textContent = viewer
          ? "Inspection complete. Preview ready."
          : "Inspection complete. WebGL preview unavailable.";
      } catch (error) {
        if (request === revision)
          status.textContent = `Preview failed: ${String(error)}. Inspection report remains available.`;
      } finally {
        if (request === revision) cancel.disabled = true;
      }
    };
    worker.postMessage({ revision: request, bytes, mapping }, [bytes]);
  } catch (error) {
    if (request === revision) {
      status.textContent = `Could not inspect file: ${String(error)}`;
      cancel.disabled = true;
      mappingPanel.reset();
      exportPanel.reset();
    }
  }
};
const startExport = (requestData: ExportRequest) => {
  if (!sourceBytes || !sourceSha || !latest) return;
  revision++;
  const request = revision;
  worker?.terminate();
  cancel.disabled = false;
  save.disabled = true;
  mappingPanel.busy("Preparing VRM export…");
  exportPanel.busy();
  status.textContent = "Exporting VRM in Rust…";
  const restoreControls = () => {
    if (latest && sourceSha) mappingPanel.show(latest, sourceSha);
    save.disabled = !latest;
    cancel.disabled = true;
  };
  const fail = (message: string) => {
    if (request !== revision) return;
    worker?.terminate();
    worker = undefined;
    restoreControls();
    exportPanel.failed(message);
    status.textContent = "VRM export failed. See export diagnostics.";
  };
  try {
    worker = new Worker(new URL("./inspect.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onerror = () =>
      fail(
        "Export worker failed. Rebuild WASM and retry if developing locally.",
      );
    worker.onmessage = ({ data }: { data: ExportWorkerReply }) => {
      if (data.revision !== revision) return;
      if (data.phase === "exporting") return;
      if (data.phase === "error") {
        fail(data.message);
        return;
      }
      worker?.terminate();
      worker = undefined;
      if (data.report.source_sha256 !== sourceSha) {
        fail("The source changed. Inspect the current GLB and export again.");
        return;
      }
      restoreControls();
      exportPanel.complete(data.report, data.bytes);
      status.textContent = data.report.export_allowed
        ? "VRM export complete. Original GLB unchanged."
        : "Export blocked. See conversion diagnostics.";
    };
    const bytes = sourceBytes.slice(0);
    worker.postMessage(
      { operation: "export", revision: request, bytes, request: requestData },
      [bytes],
    );
  } catch (error) {
    fail(`Could not export VRM: ${String(error)}`);
  }
};
el<HTMLInputElement>("file").onchange = async (event) => {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  input.value = "";
  if (!file) return;
  stop();
  const request = revision;
  latest = undefined;
  save.disabled = true;
  cancel.disabled = false;
  el("stats").replaceChildren();
  el("diagnostics").replaceChildren();
  el("nodes").replaceChildren();
  el("filename").textContent = file.name;
  status.textContent = "Reading file…";
  try {
    const bytes = await file.arrayBuffer();
    if (request !== revision) return;
    runInspection(bytes, request);
  } catch (error) {
    if (request === revision) {
      status.textContent = `Could not read file: ${String(error)}`;
      cancel.disabled = true;
    }
  }
};
cancel.onclick = () => {
  stop();
  latest = undefined;
  save.disabled = true;
  el("stats").replaceChildren();
  el("diagnostics").replaceChildren();
  el("nodes").replaceChildren();
  status.textContent = "Cancelled. Select a GLB to start again.";
};
save.onclick = () => {
  if (latest) downloadJSON(latest, "rigloom-inspection.json");
};
el("theme").onclick = () => {
  document.documentElement.classList.toggle("light");
};
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-view]",
))
  button.onclick = () =>
    viewer?.view(button.dataset.view as "front" | "side" | "free");
