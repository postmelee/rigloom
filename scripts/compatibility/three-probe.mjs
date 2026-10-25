import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export async function probe(bytes, isVrm) {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (!url.startsWith("blob:")) throw new Error(`External resource ${url}`);
    return url;
  });
  const loader = new GLTFLoader(manager);
  if (isVrm)
    loader.register(
      (parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: false }),
    );
  const gltf = await loader.parseAsync(new Uint8Array(bytes).buffer, "");
  if (isVrm && gltf.userData.vrm?.meta.metaVersion !== "1")
    throw new Error("VRM 1.0 not recognized");
  const meshes = [];
  gltf.scene.traverse((node) => {
    if (node.isSkinnedMesh) meshes.push(node);
  });
  meshes.sort(
    (a, b) =>
      Number(a.name.replace("surface-", "")) -
      Number(b.name.replace("surface-", "")),
  );
  function sample() {
    gltf.scene.updateMatrixWorld(true);
    return meshes.flatMap((mesh) => {
      mesh.skeleton.update();
      const p = mesh.geometry.getAttribute("position");
      return Array.from({ length: p.count }, (_, i) =>
        mesh
          .applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(p, i))
          .applyMatrix4(mesh.matrixWorld)
          .toArray(),
      );
    });
  }
  const neutral = sample(),
    poses = {};
  for (const [bone, axis, angle] of [
    ["leftLowerArm", "z", Math.PI / 3],
    ["rightLowerLeg", "x", Math.PI / 4],
  ]) {
    const node = gltf.scene.getObjectByName(bone);
    if (!node) throw new Error(`Missing bone ${bone}`);
    const original = node.quaternion.clone();
    node.quaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(
        axis === "z" ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0),
        angle,
      ),
    );
    poses[bone] = sample();
    node.quaternion.copy(original);
  }
  const reset = sample();
  const materials = meshes.map((mesh) => ({
    name: mesh.material.name,
    color: mesh.material.color.toArray(),
    metalness: mesh.material.metalness,
    roughness: mesh.material.roughness,
    texture: [mesh.material.map.image.width, mesh.material.map.image.height],
  }));
  const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
  renderer.setSize(480, 480);
  document.body.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#eeeeee");
  scene.add(gltf.scene, new THREE.HemisphereLight(0xffffff, 0x555555, 3));
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(0, 1, 4);
  camera.lookAt(0, 0.9, 0);
  renderer.render(scene, camera);
  const png = renderer.domElement.toDataURL("image/png");
  const result = {
    neutral,
    poses,
    reset,
    materials,
    meshes: meshes.length,
    png,
  };
  VRMUtils.deepDispose(gltf.scene);
  renderer.dispose();
  renderer.domElement.remove();
  return result;
}
