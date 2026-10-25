import * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Placement, Point } from "./placement";
export class PlacementOverlay {
  private group = new THREE.Group();
  private handles: THREE.Mesh[] = [];
  private links: THREE.LineSegments;
  private gizmo: TransformControls;
  private data?: Placement;
  private selected = 0;
  onSelect: (index: number) => void = () => {};
  onEdit: (index: number, point: Point) => void = () => {};
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
    orbit: OrbitControls,
  ) {
    this.links = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x3989ed, depthTest: false }),
    );
    this.links.renderOrder = 19;
    this.group.add(this.links);
    scene.add(this.group);
    this.gizmo = new TransformControls(camera, canvas);
    this.gizmo.setMode("translate");
    this.gizmo.setSpace("world");
    this.gizmo.setSize(0.75);
    scene.add(this.gizmo.getHelper());
    this.gizmo.addEventListener("dragging-changed", (e) => {
      orbit.enabled = !e.value;
      if (!e.value && this.data)
        this.onEdit(
          this.selected,
          this.handles[this.selected].position.toArray() as Point,
        );
    });
    this.gizmo.addEventListener("objectChange", () => this.updateLines());
    const ray = new THREE.Raycaster();
    canvas.addEventListener("pointerdown", (event) => {
      if (!this.group.visible || this.gizmo.axis || event.button !== 0) return;
      const r = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - r.left) / r.width) * 2 - 1,
          (-(event.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects(this.handles)[0];
      if (hit) {
        this.onSelect(this.handles.indexOf(hit.object as THREE.Mesh));
      }
    });
    this.show(null);
  }
  show(data: Placement | null, selected = 0) {
    this.data = data ?? undefined;
    this.group.visible = !!data;
    this.gizmo.detach();
    this.gizmo.enabled = !!data;
    if (!data) return;
    if (!this.handles.length) {
      for (let i = 0; i < 15; i++) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, 12, 8),
          new THREE.MeshBasicMaterial({ color: 0x3989ed, depthTest: false }),
        );
        mesh.renderOrder = 20;
        this.handles.push(mesh);
        this.group.add(mesh);
      }
    }
    this.selected = selected;
    const size = (data.bounds[1][1] - data.bounds[0][1]) * 0.012;
    this.handles.forEach((mesh, i) => {
      mesh.position.fromArray(data.joints[i]);
      mesh.scale.setScalar(size);
      (mesh.material as THREE.MeshBasicMaterial).color.setHex(
        i === selected ? 0xf4a340 : 0x3989ed,
      );
    });
    this.gizmo.attach(this.handles[selected]);
    this.updateLines();
  }
  private updateLines() {
    if (!this.data) return;
    const points: number[] = [];
    this.data.parents.forEach((parent, i) => {
      if (parent !== null)
        points.push(
          ...this.handles[parent].position.toArray(),
          ...this.handles[i].position.toArray(),
        );
    });
    this.links.geometry.dispose();
    this.links.geometry = new THREE.BufferGeometry();
    this.links.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
  }
}
