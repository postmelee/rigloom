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
app.innerHTML = `<header class="toolbar">
<h1>Rigloom</h1><label class="upload">Open GLB<input id="file" type="file" accept=".glb" aria-label="Open GLB"></label><span id="filename"></span>
<nav aria-label="Workspace"><button data-panel="model" aria-controls="panel-model" aria-expanded="false">Model</button><button data-panel="mapping" aria-controls="panel-mapping" aria-expanded="false">Mapping</button><button data-panel="export" aria-controls="panel-export" aria-expanded="false">Export</button><button id="theme" aria-label="Switch to dark mode">Dark</button></nav></header>
<main class="workspace"><section class="studio" aria-label="3D model preview"><div class="stage-bar"><p id="status" role="status" aria-live="polite">Ready.</p><button id="cancel" disabled>Cancel</button><div class="view-tools" aria-label="Camera view"><button data-view="front" aria-pressed="false">Front</button><button data-view="side" aria-pressed="false">Side</button><button data-view="free" aria-pressed="true">Free</button></div></div>
<div class="viewport"><canvas aria-label="Orbitable model canvas" tabindex="0"></canvas><p class="empty" id="empty">Open a GLB to preview it.</p></div></section>
<aside id="inspector" class="inspector" hidden><div class="inspector-heading"><h2 id="panel-title">Model</h2><button id="close-panel" aria-label="Close panel" title="Close (Esc)">×</button></div>
<section id="panel-model" class="panel" hidden><dl id="stats"></dl><button id="report" disabled>Save report</button><details><summary>Node hierarchy</summary><ul id="nodes"></ul></details><p><a href="https://github.com/postmelee/rigloom/blob/main/docs/guide/en.md" target="_blank" rel="noreferrer">Help</a></p></section>
<details id="diagnostic-details" class="diagnostics" hidden><summary id="diagnostic-summary">Diagnostics</summary><ul id="diagnostics"></ul></details></aside></main>`;
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
type Panel = "model" | "mapping" | "export";
let activePanel: Panel | null = null;
const panelButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-panel]"),
];
const setPanel = (panel: Panel | null) => {
  activePanel = panel;
  el("inspector").hidden = panel === null;
  for (const button of panelButtons) {
    const selected = button.dataset.panel === panel;
    button.setAttribute("aria-expanded", String(selected));
    el(`panel-${button.dataset.panel}`).hidden = !selected;
    if (selected) el("panel-title").textContent = button.textContent;
  }
};
for (const button of panelButtons)
  button.onclick = () =>
    setPanel(
      activePanel === button.dataset.panel
        ? null
        : (button.dataset.panel as Panel),
    );
const closePanel = () => {
  const trigger = panelButtons.find(
    (button) => button.dataset.panel === activePanel,
  );
  setPanel(null);
  trigger?.focus();
};
el("close-panel").onclick = closePanel;
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activePanel) closePanel();
});
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
mappingPanel.root.id = "panel-mapping";
exportPanel.root.id = "panel-export";
for (const panel of [mappingPanel.root, exportPanel.root]) {
  panel.className = "panel";
  panel.hidden = true;
  el("diagnostic-details").before(panel);
}
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
  el("diagnostic-details").hidden = true;
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
  const diagnostics = [
    ...report.diagnostics,
    ...(report.rig?.mapping.diagnostics ?? []),
    ...(report.rig?.binds.diagnostics ?? []),
  ].filter((d) => !["inspection_only", "animations_static"].includes(d.code));
  el("diagnostic-details").hidden = diagnostics.length === 0;
  el<HTMLDetailsElement>("diagnostic-details").open = diagnostics.some(
    (d) => d.severity === "error",
  );
  el("diagnostic-summary").textContent = `Diagnostics (${diagnostics.length})`;
  for (const diagnostic of diagnostics) {
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
  status.textContent = "Inspecting…";
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
        status.textContent = "Inspecting…";
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
          for (const button of document.querySelectorAll<HTMLButtonElement>(
            "[data-view]",
          ))
            button.setAttribute(
              "aria-pressed",
              String(button.dataset.view === "free"),
            );
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
  status.textContent = "Exporting…";
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
  el("filename").title = file.name;
  setPanel("model");
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
  el("filename").textContent = "";
  el("filename").removeAttribute("title");
  status.textContent = "Cancelled. Select a GLB to start again.";
};
save.onclick = () => {
  if (latest) downloadJSON(latest, "rigloom-inspection.json");
};
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
let savedTheme: string | null = null;
try {
  savedTheme = localStorage.getItem("rigloom-theme");
} catch {
  /* Storage may be disabled. */
}
let explicitTheme = savedTheme === "dark" || savedTheme === "light";
const applyTheme = (dark: boolean) => {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  el("theme").textContent = dark ? "Light" : "Dark";
  el("theme").setAttribute(
    "aria-label",
    `Switch to ${dark ? "light" : "dark"} mode`,
  );
  viewer?.setTheme(dark);
};
applyTheme(explicitTheme ? savedTheme === "dark" : systemTheme.matches);
systemTheme.addEventListener("change", (event) => {
  if (!explicitTheme) applyTheme(event.matches);
});
el("theme").onclick = () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  explicitTheme = true;
  applyTheme(dark);
  try {
    localStorage.setItem("rigloom-theme", dark ? "dark" : "light");
  } catch {
    /* Theme still works without storage. */
  }
};
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-view]",
))
  button.onclick = () => {
    viewer?.view(button.dataset.view as "front" | "side" | "free");
    for (const item of document.querySelectorAll<HTMLButtonElement>(
      "[data-view]",
    ))
      item.setAttribute("aria-pressed", String(item === button));
  };
