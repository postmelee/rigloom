import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PlacementOverlay } from "./placement-overlay";
import type { Placement } from "./placement";
export class Viewer {
  readonly placement: PlacementOverlay;
  onView: (mode: "front" | "side" | "free") => void = () => {};
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10000);
  private controls: OrbitControls;
  private current: THREE.Group | null = null;
  private skeleton: THREE.SkeletonHelper | null = null;
  private generation = 0;
  private surfaceObjects = new Map<string, THREE.Object3D>();
  private surfaceOutline: THREE.BoxHelper | null = null;
  private nodeObjects = new Map<number, THREE.Object3D>();
  private grid = new THREE.GridHelper(10, 20, 0xb5b5b5, 0xe2e2e2);
  private center = new THREE.Vector3();
  private radius = 2;
  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener("pointerdown", () =>
      canvas.focus({ preventScroll: true }),
    );
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene.background = new THREE.Color("#111a20");
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 3));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 4);
    this.scene.add(light);
    this.grid.visible = false;
    this.scene.add(this.grid);
    this.controls = new OrbitControls(this.camera, canvas);
    this.placement = new PlacementOverlay(
      this.scene,
      this.camera,
      canvas,
      this.controls,
    );
    canvas.addEventListener("keydown", (event) => {
      if (
        event.target !== canvas ||
        event.defaultPrevented ||
        event.isComposing ||
        event.keyCode === 229 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        !this.current ||
        this.placement.dragging
      )
        return;
      const key = event.key.toLowerCase();
      if (
        !["+", "=", "-", "i", "j", "k", "l", "f", "1", "2", "3"].includes(key)
      )
        return;
      if (event.shiftKey && ["f", "1", "2", "3"].includes(key)) return;
      event.preventDefault();
      if (["1", "2", "3"].includes(key))
        this.view(
          ({ "1": "front", "2": "side", "3": "free" } as const)[
            key as "1" | "2" | "3"
          ],
        );
      else this.navigate(key, event.shiftKey);
    });
    this.camera.position.set(3, 2, 4);
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement!);
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
  setTheme(dark: boolean) {
    this.scene.background = new THREE.Color(dark ? "#101010" : "#ffffff");
    // GridHelper stores its two line colors as per-vertex colors.
    const colors = this.grid.geometry.getAttribute("color");
    const center = new THREE.Color(dark ? "#555555" : "#aaaaaa");
    const line = new THREE.Color(dark ? "#292929" : "#e3e3e3");
    for (let i = 0; i < colors.count; i++) {
      const color = Math.floor(i / 4) === 10 ? center : line;
      colors.setXYZ(i, color.r, color.g, color.b);
    }
    colors.needsUpdate = true;
  }
  private resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement!;
    this.renderer.setSize(w, h, false);
    const before = this.fitDistance();
    this.camera.aspect = Math.max(w / Math.max(h, 1), 0.01);
    if (this.current)
      this.camera.position
        .sub(this.controls.target)
        .multiplyScalar(this.fitDistance() / before)
        .add(this.controls.target);
    this.camera.updateProjectionMatrix();
  }
  private dispose(group: THREE.Object3D) {
    const textures = new Set<THREE.Texture>();
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) textures.add(value);
          }
          material.dispose();
        }
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
      }
    });
    for (const texture of textures) {
      texture.dispose();
      if (
        typeof ImageBitmap !== "undefined" &&
        texture.image instanceof ImageBitmap
      )
        texture.image.close();
    }
  }
  setPlacement(data: Placement | null, selected = 0, translucent = false) {
    this.placement.show(data, selected);
    if (this.current) {
      this.current.matrixAutoUpdate = false;
      if (data) this.current.matrix.fromArray(data.matrix.flat());
      else this.current.matrix.identity();
      this.current.updateMatrixWorld(true);
      this.current.traverse((node) => {
        if (node instanceof THREE.Mesh)
          for (const m of Array.isArray(node.material)
            ? node.material
            : [node.material]) {
            m.userData.rigOpacity ??= m.opacity;
            m.userData.rigTransparent ??= m.transparent;
            m.opacity = translucent ? 0.35 : m.userData.rigOpacity;
            m.transparent = translucent || m.userData.rigTransparent;
            m.needsUpdate = true;
          }
      });
      const box = new THREE.Box3().setFromObject(this.current);
      box.getCenter(this.center);
      this.radius = Math.max(
        box.getSize(new THREE.Vector3()).length() / 2,
        0.1,
      );
      this.camera.near = this.radius / 1000;
      this.camera.far = this.radius * 100;
      this.camera.updateProjectionMatrix();
    }
  }
  pose(node: number | null, axis: "x" | "z", radians: number) {
    // Only generated translation-only bones are passed by the Rig panel.
    for (const object of this.nodeObjects.values())
      if (object instanceof THREE.Bone) object.quaternion.identity();
    const object = node === null ? undefined : this.nodeObjects.get(node);
    if (object instanceof THREE.Bone) object.rotation[axis] = radians;
    this.current?.updateMatrixWorld(true);
  }
  outlineSurface(node: number | null, primitive = 0) {
    if (this.surfaceOutline) {
      this.scene.remove(this.surfaceOutline);
      this.surfaceOutline.dispose();
      this.surfaceOutline = null;
    }
    const object =
      node === null
        ? undefined
        : this.surfaceObjects.get(`${node}:${primitive}`);
    if (!object) return;
    object.updateWorldMatrix(true, true);
    this.surfaceOutline = new THREE.BoxHelper(object, 0xe09b24);
    this.surfaceOutline.material.depthTest = false;
    this.surfaceOutline.renderOrder = 11;
    this.scene.add(this.surfaceOutline);
  }
  clear() {
    this.outlineSurface(null);
    this.surfaceObjects.clear();
    this.nodeObjects.clear();
    this.placement.show(null);
    ++this.generation;
    this.grid.visible = false;
    if (this.current) {
      this.scene.remove(this.current);
      this.dispose(this.current);
      this.current = null;
    }
    if (this.skeleton) {
      this.scene.remove(this.skeleton);
      this.skeleton.dispose();
      this.skeleton = null;
    }
  }
  async load(bytes: ArrayBuffer) {
    this.clear();
    const generation = this.generation;
    // Defense in depth: Rust rejects URI resources before GLTFLoader runs.
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      if (url.startsWith("blob:")) return url;
      throw new Error(
        "External resource blocked. Embed images and buffers in the GLB.",
      );
    });
    const gltf = await new GLTFLoader(manager).parseAsync(bytes, "");
    if (generation !== this.generation) {
      this.dispose(gltf.scene);
      return false;
    }
    this.grid.visible = true;
    this.current = gltf.scene;
    gltf.scene.traverse((object) => {
      const index = gltf.parser.associations.get(object)?.nodes;
      if (index !== undefined) this.nodeObjects.set(index, object);
    });
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const primitive = gltf.parser.associations.get(object)?.primitives;
      let parent: THREE.Object3D | null = object;
      while (parent) {
        const node = gltf.parser.associations.get(parent)?.nodes;
        if (node !== undefined) {
          if (primitive !== undefined)
            this.surfaceObjects.set(`${node}:${primitive}`, object);
          break;
        }
        parent = parent.parent;
      }
    });
    this.scene.add(this.current);
    this.skeleton = new THREE.SkeletonHelper(this.current);
    for (const material of Array.isArray(this.skeleton.material)
      ? this.skeleton.material
      : [this.skeleton.material])
      material.depthTest = false;
    this.skeleton.renderOrder = 10;
    this.scene.add(this.skeleton);
    const box = new THREE.Box3().setFromObject(this.current);
    box.getCenter(this.center);
    this.radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.1);
    this.camera.near = this.radius / 1000;
    this.camera.far = this.radius * 100;
    this.camera.updateProjectionMatrix();
    this.view("free");
    return true;
  }
  private navigate(key: string, pan: boolean) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    if (offset.lengthSq() === 0) offset.set(0, 0, this.radius * 0.02);
    if (key === "f") {
      this.controls.target.copy(this.center);
      this.camera.position
        .copy(this.center)
        .add(offset.setLength(this.fitDistance()));
    } else if (["+", "=", "-"].includes(key)) {
      const distance = THREE.MathUtils.clamp(
        offset.length() * (key === "-" ? 1 / 0.9 : 0.9),
        this.radius * 0.02,
        Math.max(this.radius * 50, this.fitDistance() * 2),
      );
      this.camera.position
        .copy(this.controls.target)
        .add(offset.setLength(distance));
    } else if (pan) {
      const vertical = key === "i" || key === "k";
      const direction = (
        vertical ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
      ).applyQuaternion(this.camera.quaternion);
      const step =
        offset.length() *
        Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
        0.1;
      direction.multiplyScalar(step * (key === "j" || key === "k" ? -1 : 1));
      this.controls.target.add(direction);
      this.camera.position.add(direction);
    } else {
      const spherical = new THREE.Spherical().setFromVector3(offset);
      const step = Math.PI / 24;
      if (key === "j" || key === "l")
        spherical.theta += key === "j" ? -step : step;
      else
        spherical.phi = THREE.MathUtils.clamp(
          spherical.phi + (key === "i" ? -step : step),
          0.01,
          Math.PI - 0.01,
        );
      this.camera.position
        .copy(this.controls.target)
        .add(new THREE.Vector3().setFromSpherical(spherical));
      this.onView("free");
    }
    this.controls.update();
  }
  private fitDistance() {
    const halfAngle = Math.atan(
      Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
        Math.min(1, this.camera.aspect),
    );
    return (this.radius / Math.sin(halfAngle)) * 1.1;
  }
  view(mode: "front" | "side" | "free") {
    this.onView(mode);
    const direction =
      mode === "front"
        ? new THREE.Vector3(0, 0, 1)
        : mode === "side"
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(1, 0.6, 1).normalize();
    this.camera.position
      .copy(this.center)
      .addScaledVector(direction, this.fitDistance());
    this.controls.target.copy(this.center);
    this.controls.update();
  }
}
