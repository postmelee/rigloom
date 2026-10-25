// Local-only, geometry-focused benchmark adapter. Never a product VRM importer.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Matrix4, Quaternion, Vector3 } from "three";
import { readGlb, writeGlb } from "../export-fixture.mjs";
export const bones = [
  "hips",
  "spine",
  "head",
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
];
export const parents = [null, 0, 1, 0, 3, 4, 0, 6, 7, 1, 9, 10, 1, 12, 13];
export const digest = (b) => createHash("sha256").update(b).digest("hex");
export function accessor(json, bin, index) {
  const a = json.accessors[index],
    v = json.bufferViews[a.bufferView];
  if (a.sparse) throw Error("Sparse test input not supported");
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
  if (!size || !n) throw Error("Unsupported benchmark accessor");
  return Array.from({ length: a.count }, (_, i) =>
    Array.from({ length: n }, (_, k) => {
      const offset =
        (v.byteOffset ?? 0) +
        (a.byteOffset ?? 0) +
        i * (v.byteStride ?? n * size) +
        k * size;
      let x =
        a.componentType === 5126
          ? bin.readFloatLE(offset)
          : bin.readUIntLE(offset, size);
      if (a.normalized && a.componentType !== 5126) x /= 2 ** (size * 8) - 1;
      return x;
    }),
  );
}
export function encodeSurface(parts) {
  const json = {
    asset: {
      version: "2.0",
      generator: "Rigloom local geometry-only quality adapter",
    },
    buffers: [{ byteLength: 0 }],
    bufferViews: [],
    accessors: [],
    materials: [],
    meshes: [],
    nodes: [],
    scenes: [{ nodes: [] }],
    scene: 0,
  };
  const chunks = [];
  let length = 0;
  const append = (values, type, componentType = 5126) => {
    const bytes = Buffer.alloc(values.flat().length * 4);
    values
      .flat()
      .forEach((v, i) =>
        componentType === 5126
          ? bytes.writeFloatLE(v, i * 4)
          : bytes.writeUInt32LE(v, i * 4),
      );
    const view = json.bufferViews.length;
    json.bufferViews.push({
      buffer: 0,
      byteOffset: length,
      byteLength: bytes.length,
    });
    chunks.push(bytes);
    length += bytes.length;
    const id = json.accessors.length;
    json.accessors.push({
      bufferView: view,
      componentType,
      type,
      count: values.length,
    });
    return id;
  };
  for (const part of parts) {
    const pos = append(part.points, "VEC3");
    json.accessors[pos].min = [0, 1, 2].map((a) =>
      part.points.reduce((v, p) => Math.min(v, p[a]), Infinity),
    );
    json.accessors[pos].max = [0, 1, 2].map((a) =>
      part.points.reduce((v, p) => Math.max(v, p[a]), -Infinity),
    );
    const material = json.materials.length;
    json.materials.push({
      name: part.label,
      pbrMetallicRoughness: {
        baseColorFactor: part.color ?? [0.6, 0.7, 0.85, 1],
        metallicFactor: 0,
        roughnessFactor: 0.8,
      },
      doubleSided: true,
    });
    const mesh = json.meshes.length;
    json.meshes.push({
      primitives: [
        {
          attributes: { POSITION: pos },
          indices: append(
            part.indices.map((i) => [i]),
            "SCALAR",
            5125,
          ),
          material,
        },
      ],
    });
    json.scenes[0].nodes.push(json.nodes.length);
    json.nodes.push({ name: part.label, mesh });
  }
  json.buffers[0].byteLength = length;
  return writeGlb(json, Buffer.concat(chunks));
}
export async function prepareReal(input, outDir) {
  const bytes = await readFile(input);
  const { json, bin } = readGlb(bytes);
  const accepted = [
    "624d0d554bc205bbdc33e22a68a2c3c20edebb3e573011ead8878a65e5329b23",
    "12c2b97e95e700783a6a550dc0eee2d7880aeedccef9ae67bc4c5a2f0f2631a2",
  ];
  if (!accepted.includes(digest(bytes)))
    throw Error(
      "Only the two reviewed sample hashes are accepted by this local adapter",
    );
  const vrm = json.extensions?.VRMC_vrm;
  if (!vrm) throw Error("Pinned VRM 1.0 benchmark input required");
  const worlds = [],
    parent = [];
  const visit = (id, m) => {
    const n = json.nodes[id];
    const local = n.matrix
      ? new Matrix4().fromArray(n.matrix)
      : new Matrix4().compose(
          new Vector3(...(n.translation ?? [0, 0, 0])),
          new Quaternion(...(n.rotation ?? [0, 0, 0, 1])),
          new Vector3(...(n.scale ?? [1, 1, 1])),
        );
    worlds[id] = m.clone().multiply(local);
    for (const c of n.children ?? []) {
      parent[c] = id;
      visit(c, worlds[id]);
    }
  };
  for (const n of json.scenes[json.scene ?? 0].nodes) visit(n, new Matrix4());
  const ids = bones.map((b) => vrm.humanoid.humanBones[b]?.node);
  if (ids.some((i) => i === undefined)) throw Error("Missing required bones");
  const canonical = (node) => {
    while (node !== undefined) {
      const i = ids.indexOf(node);
      if (i >= 0) return i;
      node = parent[node];
    }
    return 0;
  };
  const joints = ids.map((i) =>
    new Vector3().setFromMatrixPosition(worlds[i]).toArray(),
  );
  const parts = [];
  json.nodes.forEach((node, ni) => {
    if (node.mesh === undefined || !worlds[ni]) return;
    const skin = node.skin === undefined ? undefined : json.skins[node.skin];
    const ibms = skin
      ? accessor(json, bin, skin.inverseBindMatrices).map((a) =>
          new Matrix4().fromArray(a),
        )
      : [];
    for (const [pi, p] of json.meshes[node.mesh].primitives.entries()) {
      const points = accessor(json, bin, p.attributes.POSITION);
      const weights = points.map(() => Array(15).fill(0));
      const sets = [];
      for (let set = 0; p.attributes[`JOINTS_${set}`] !== undefined; set++)
        sets.push([
          accessor(json, bin, p.attributes[`JOINTS_${set}`]),
          accessor(json, bin, p.attributes[`WEIGHTS_${set}`]),
        ]);
      const neutral = points.map((p, i) => {
        if (!skin) {
          weights[i][0] = 1;
          return new Vector3(...p).applyMatrix4(worlds[ni]).toArray();
        }
        const out = new Vector3();
        let sum = 0;
        for (const [j, w] of sets)
          for (let k = 0; k < 4; k++) {
            if (!w[i][k]) continue;
            const id = j[i][k];
            const n = skin.joints[id];
            out.addScaledVector(
              new Vector3(...p).applyMatrix4(
                worlds[n].clone().multiply(ibms[id]),
              ),
              w[i][k],
            );
            weights[i][canonical(n)] += w[i][k];
            sum += w[i][k];
          }
        if (Math.abs(sum - 1) > 0.001)
          throw Error("Reference weights not normalized");
        return out.toArray();
      });
      const m = json.materials[p.material];
      parts.push({
        label: `${node.name ?? ni}/${pi}`,
        points: neutral,
        weights,
        indices:
          p.indices === undefined
            ? points.map((_, i) => i)
            : accessor(json, bin, p.indices).flat(),
        color: m?.pbrMetallicRoughness?.baseColorFactor,
      });
    }
  });
  // Use the exact same prepared frame for anatomy and reference positions.
  const all = parts.flatMap((p) => p.points),
    min = [0, 1, 2].map((a) =>
      all.reduce((v, p) => Math.min(v, p[a]), Infinity),
    ),
    max = [0, 1, 2].map((a) =>
      all.reduce((v, p) => Math.max(v, p[a]), -Infinity),
    );
  const shift = [-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2];
  for (const p of all) for (let a = 0; a < 3; a++) p[a] += shift[a];
  for (const p of joints) for (let a = 0; a < 3; a++) p[a] += shift[a];
  await mkdir(outDir, { recursive: true });
  const source = encodeSurface(parts);
  await writeFile(`${outDir}/source.glb`, source);
  await writeFile(
    `${outDir}/reference.json`,
    JSON.stringify({ joints, parts }),
  );
  await writeFile(
    `${outDir}/request.json`,
    JSON.stringify({
      frame: { up: "Y", turn: 0, scale: 1, floor: true },
      joints,
      method: "surface",
      rigid: {},
    }),
  );
  const savedRequest = JSON.parse(
    await readFile(`${outDir}/request.json`, "utf8"),
  );
  await writeFile(
    `${outDir}/placement.json`,
    JSON.stringify({
      ...savedRequest,
      schema_version: 1,
      source_sha256: digest(source),
    }),
  );
  const provenance = {
    source_sha256: digest(bytes),
    derived_sha256: digest(source),
    meta: vrm.meta,
    vertices: all.length,
    primitives: parts.length,
    profile:
      "geometry-only; baked neutral positions; discarded textures/material extensions, morphs, animation/constraints, original skeleton on separate test copy; original bytes unchanged; no product VRM-import claim",
  };
  await writeFile(
    `${outDir}/provenance.json`,
    JSON.stringify(provenance, null, 2),
  );
  return provenance;
}
if (process.argv[1]?.endsWith("real-model.mjs"))
  console.log(
    JSON.stringify(
      await prepareReal(process.argv[2], process.argv[3]),
      null,
      2,
    ),
  );
