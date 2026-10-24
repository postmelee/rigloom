// Isolated verification entry, bundled in memory by the test runner, not the app.
import { LoadingManager } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export async function loadVrm(data) {
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    if (!url.startsWith("blob:"))
      throw new Error(`Unexpected VRM resource request: ${url}`);
    return url;
  });
  const loader = new GLTFLoader(manager);
  loader.register(
    (parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: false }),
  );
  const gltf = await loader.parseAsync(new Uint8Array(data).buffer, "");
  const vrm = gltf.userData.vrm;
  if (!vrm || vrm.meta.metaVersion !== "1")
    throw new Error("Independent loader did not recognize VRM 1.0");
  vrm.scene.updateMatrixWorld(true);
  const bones = {},
    matrices = {};
  for (const [key, bone] of Object.entries(vrm.humanoid.rawHumanBones)) {
    bones[key] = gltf.parser.associations.get(bone.node)?.nodes ?? null;
    matrices[key] = bone.node.matrix.toArray();
  }
  const meshes = [];
  vrm.scene.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    meshes.push({
      node: gltf.parser.associations.get(node)?.nodes ?? null,
      skinned: Boolean(node.isSkinnedMesh),
      vertices: node.geometry.getAttribute("position").count,
      skinWeights: node.geometry.getAttribute("skinWeight")?.array
        ? Array.from(node.geometry.getAttribute("skinWeight").array)
        : null,
      inverseBinds:
        node.skeleton?.boneInverses.map((matrix) => matrix.toArray()) ?? null,
      materials: materials.map((material) => ({
        type: material.type,
        color: material.color?.toArray() ?? null,
        metalness: material.metalness ?? null,
        roughness: material.roughness ?? null,
        texture: material.map
          ? {
              width: material.map.image?.width,
              height: material.map.image?.height,
            }
          : null,
      })),
    });
  });
  const meta = vrm.meta;
  const result = {
    meta: {
      metaVersion: meta.metaVersion,
      name: meta.name,
      authors: meta.authors,
      licenseUrl: meta.licenseUrl,
      avatarPermission: meta.avatarPermission,
      commercialUsage: meta.commercialUsage,
      allowRedistribution: meta.allowRedistribution,
      modification: meta.modification,
    },
    bones,
    matrices,
    meshes,
    animations: gltf.animations.length,
  };
  VRMUtils.deepDispose(vrm.scene);
  return result;
}
