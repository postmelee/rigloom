// Development-only comparison; no sample assets are bundled or downloaded.
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const input = Object.fromEntries(
  ["model", "pose", "view", "framing"].map((id) => [
    id,
    document.getElementById(id),
  ]),
);
const views = [];
const main = document.querySelector("main");
for (const label of ["Authored reference", "Surface v1", "Surface v2"]) {
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  heading.textContent = label;
  section.append(heading);
  main.append(section);
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  section.append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color("#303238");
  scene.add(new T.HemisphereLight(0xffffff, 0x777777, 2));
  const light = new T.DirectionalLight(0xffffff, 3);
  light.position.set(2, 4, 4);
  scene.add(light);
  const camera = new T.PerspectiveCamera(35, 1, 0.001, 100),
    controls = new OrbitControls(camera, renderer.domElement);
  views.push({ renderer, scene, camera, controls, section });
  controls.addEventListener("change", () => {
    for (const v of views)
      if (v.camera !== camera) {
        v.camera.position.copy(camera.position);
        v.camera.quaternion.copy(camera.quaternion);
        v.controls.target.copy(controls.target);
      }
  });
}
let revision = 0;
async function load() {
  const current = ++revision;
  const sample = input.model.value,
    base = sample === "seed-rigid" ? "seed" : sample,
    pose = input.pose.value;
  const root = "/.local/weight-quality/";
  const paths = [
    `${base}/reference-${pose}.glb`,
    `${base}-baseline/surface-${pose}.glb`,
    `${sample}/surface-${pose}.glb`,
  ];
  document.getElementById("status").textContent = "Loading…";
  try {
    const [objects, reference] = await Promise.all([
      Promise.all(paths.map((p) => new GLTFLoader().loadAsync(root + p))),
      fetch(root + base + "/reference.json").then((r) => {
        if (!r.ok) throw Error("Prepare the local samples first");
        return r.json();
      }),
    ]);
    if (current !== revision) return;
    const box = new T.Box3();
    for (const part of reference.parts)
      for (const point of part.points)
        box.expandByPoint(new T.Vector3(...point));
    const center =
      input.framing.value === "joint"
        ? new T.Vector3(...reference.joints[pose === "leftLowerArm" ? 10 : 4])
        : box.getCenter(new T.Vector3());
    const size = box.getSize(new T.Vector3());
    const aspect = views[0].section.clientWidth / 620;
    const distance =
      input.framing.value === "joint"
        ? 0.65
        : (Math.max(size.y, size.x / aspect, size.z / aspect) /
            (2 * Math.tan((35 * Math.PI) / 360))) *
          1.15;
    views.forEach((v, i) => {
      if (v.object) {
        v.scene.remove(v.object);
        v.object.traverse((o) => {
          if (o.isMesh) {
            o.geometry.dispose();
            o.material.dispose();
          }
        });
      }
      v.object = objects[i].scene;
      v.object.traverse((o) => {
        if (o.isMesh) {
          o.geometry.computeVertexNormals();
          o.material.dispose();
          o.material = new T.MeshStandardMaterial({
            color: 0xb5c6d8,
            roughness: 0.8,
            side: T.DoubleSide,
          });
        }
      });
      v.scene.add(v.object);
      v.controls.target.copy(center);
      v.camera.position
        .copy(center)
        .add(
          input.view.value === "front"
            ? new T.Vector3(0, 0, distance)
            : new T.Vector3(distance, 0, 0),
        );
      v.camera.lookAt(center);
    });
    document.getElementById("status").textContent =
      sample === "seed-rigid"
        ? "Only v2 includes explicit accessory → spine assignments. This is manual correction, not automatic inference."
        : "Automatic weights; no attachment overrides. Inspect folds and remote motion as well as the numeric report.";
  } catch (error) {
    if (current === revision)
      document.getElementById("status").textContent = String(error);
  }
}
for (const element of Object.values(input)) element.onchange = load;
await load();
function frame() {
  for (const v of views) {
    const w = v.section.clientWidth,
      h = 620;
    v.renderer.setSize(w, h, false);
    v.camera.aspect = w / h;
    v.camera.updateProjectionMatrix();
    v.renderer.render(v.scene, v.camera);
  }
  requestAnimationFrame(frame);
}
frame();
