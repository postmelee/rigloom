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
import type { Inspection, WorkerReply } from "./protocol";
import "./style.css";
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<header><a class="brand" href="./"><i data-lucide="box"></i>Rigloom</a><span class="badge">M1 · local development</span><div class="spacer"></div><button id="theme" aria-label="Toggle light or dark theme"><i data-lucide="sun-moon"></i></button></header>
<main><aside><div class="eyebrow">CHARACTER WORKSPACE</div><h1>Inspect your model</h1><p>Start with a self-contained GLB. Review its structure before preparing a humanoid rig.</p><label class="upload"><i data-lucide="upload"></i>Open GLB<input id="file" type="file" accept=".glb" aria-label="Open GLB"></label><button id="cancel" disabled><i data-lucide="x"></i>Cancel inspection</button><ol class="steps"><li aria-current="step"><b>01</b> Inspect GLB <span>Available</span></li><li><b>02</b> Map humanoid <span>Planned</span></li><li><b>03</b> Prepare skin <span>Planned</span></li><li><b>04</b> Export VRM <span>Planned</span></li></ol><div class="note">Preview does not certify skinning or VRM validity. Joint editing and export are not available yet.</div><a href="https://github.com/postmelee/rigloom" target="_blank" rel="noreferrer">Project & documentation ↗</a></aside>
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
  latest: Inspection | undefined;
const stop = () => {
  revision++;
  worker?.terminate();
  worker = undefined;
  cancel.disabled = true;
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
  for (const diagnostic of report.diagnostics) {
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
        return;
      }
      showReport(data.report);
      if (!data.report.preview_allowed) {
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
    worker.postMessage({ revision: request, bytes }, [bytes]);
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
  if (!latest) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(latest, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "rigloom-inspection.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
el("theme").onclick = () => {
  document.documentElement.classList.toggle("light");
};
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-view]",
))
  button.onclick = () =>
    viewer?.view(button.dataset.view as "front" | "side" | "free");
