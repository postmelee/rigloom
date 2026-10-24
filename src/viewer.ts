import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.01, 10000);
  private controls: OrbitControls;
  private current: THREE.Group | null = null;
  private skeleton: THREE.SkeletonHelper | null = null;
  private generation = 0;
  private center = new THREE.Vector3();
  private radius = 2;
  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene.background = new THREE.Color("#111a20");
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 3));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 4);
    this.scene.add(light);
    const grid = new THREE.GridHelper(10, 20, 0x537080, 0x263844);
    this.scene.add(grid);
    this.controls = new OrbitControls(this.camera, canvas);
    this.camera.position.set(3, 2, 4);
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement!);
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
  private resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement!;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
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
  clear() {
    ++this.generation;
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
    this.current = gltf.scene;
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
  view(mode: "front" | "side" | "free") {
    const direction =
      mode === "front"
        ? new THREE.Vector3(0, 0, 1)
        : mode === "side"
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(1, 0.6, 1).normalize();
    this.camera.position
      .copy(this.center)
      .addScaledVector(direction, this.radius * 3.2);
    this.controls.target.copy(this.center);
    this.controls.update();
  }
}
