// Original MIT test geometry: three square rings per limb, with authored blends.
// No downloaded mesh, motion, rigging algorithm or product skin generator.
import { exportFixture, readGlb, writeGlb } from "../export-fixture.mjs";
import { boneNodes, requiredBones } from "../rig-fixture.mjs";

export const variants = ["standard", "short-wide", "asymmetric"];
export function humanoidFixture(variant = "standard") {
  if (!variants.includes(variant))
    throw new Error(`Unknown fixture ${variant}`);
  const { json, bin: original } = readGlb(exportFixture());
  let bin = original;
  const append = (values, type, components, integer = false) => {
    const data = Buffer.alloc(values.length * (integer ? 2 : 4));
    values.forEach((v, i) =>
      integer ? data.writeUInt16LE(v, i * 2) : data.writeFloatLE(v, i * 4),
    );
    const offset = Math.ceil(bin.length / 4) * 4;
    bin = Buffer.concat([bin, Buffer.alloc(offset - bin.length), data]);
    const view = json.bufferViews.length;
    json.bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: data.length,
    });
    const index = json.accessors.length;
    json.accessors.push({
      bufferView: view,
      componentType: integer ? 5123 : 5126,
      type,
      count: values.length / components,
    });
    return index;
  };
  delete json.nodes[0].translation;
  delete json.nodes[0].scale;
  delete json.animations;
  delete json.cameras;
  json.nodes = json.nodes.slice(0, 17);
  json.nodes[0].children = [boneNodes.hips];
  delete json.nodes[1].mesh;
  delete json.nodes[1].skin;
  if (variant === "short-wide") {
    for (const key of requiredBones) {
      const t = json.nodes[boneNodes[key]].translation;
      t[0] *= 1.3;
      t[1] *= 0.7;
    }
  }
  if (variant === "asymmetric") {
    json.nodes[boneNodes.leftLowerArm].translation[0] *= 0.75;
    json.nodes[boneNodes.rightLowerLeg].translation[1] *= 0.85;
  }
  const world = {};
  function visit(index, parent) {
    const n = json.nodes[index];
    const p = (n.translation ?? [0, 0, 0]).map((v, i) => v + parent[i]);
    world[index] = p;
    for (const child of n.children ?? []) visit(child, p);
  }
  visit(0, [0, 0, 0]);
  const inverse = requiredBones.flatMap((key) => {
    const [x, y, z] = world[boneNodes[key]];
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1];
  });
  json.skins[0].inverseBindMatrices = append(inverse, "MAT4", 16);
  json.meshes = [];
  const segments = [
    ["hips", "spine", 0.18],
    ["spine", "head", 0.15],
    ...["left", "right"].flatMap((side) => [
      [side + "UpperArm", side + "LowerArm", 0.065],
      [side + "LowerArm", side + "Hand", 0.05],
      [side + "UpperLeg", side + "LowerLeg", 0.085],
      [side + "LowerLeg", side + "Foot", 0.065],
    ]),
  ];
  const oracle = [];
  for (const [a, b, r] of segments) {
    const start = world[boneNodes[a]],
      end = world[boneNodes[b]];
    const alongX = Math.abs(end[0] - start[0]) > Math.abs(end[1] - start[1]);
    const positions = [],
      normals = [],
      uv = [],
      joints = [],
      weights = [],
      indices = [];
    for (let ring = 0; ring < 3; ring++) {
      const t = ring / 2;
      for (const [u, v] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        const p = start.map((x, i) => x + (end[i] - x) * t);
        p[alongX ? 1 : 0] += u * r;
        p[2] += v * r;
        positions.push(...p);
        normals.push(
          ...(alongX
            ? [0, u / Math.SQRT2, v / Math.SQRT2]
            : [u / Math.SQRT2, 0, v / Math.SQRT2]),
        );
        uv.push((u + 1) / 2, t);
        joints.push(requiredBones.indexOf(a), requiredBones.indexOf(b), 0, 0);
        weights.push(1 - t, t, 0, 0);
        oracle.push({ p, a, b, t });
      }
    }
    for (let ring = 0; ring < 2; ring++)
      for (let i = 0; i < 4; i++) {
        const a = ring * 4 + i,
          b = ring * 4 + ((i + 1) % 4),
          c = a + 4,
          d = b + 4;
        indices.push(a, b, c, b, d, c);
      }
    indices.push(0, 2, 1, 0, 3, 2, 8, 9, 10, 8, 10, 11);
    const position = append(positions, "VEC3", 3);
    json.accessors[position].min = [0, 1, 2].map((i) =>
      Math.min(...positions.filter((_, j) => j % 3 === i)),
    );
    json.accessors[position].max = [0, 1, 2].map((i) =>
      Math.max(...positions.filter((_, j) => j % 3 === i)),
    );
    const mesh = json.meshes.length;
    json.meshes.push({
      name: `${a}-${b}`,
      primitives: [
        {
          attributes: {
            POSITION: position,
            NORMAL: append(normals, "VEC3", 3),
            TEXCOORD_0: append(uv, "VEC2", 2),
            JOINTS_0: append(joints, "VEC4", 4, true),
            WEIGHTS_0: append(weights, "VEC4", 4),
          },
          indices: append(indices, "SCALAR", 1, true),
          material: 0,
        },
      ],
    });
    json.nodes[0].children.push(json.nodes.length);
    json.nodes.push({ name: `surface-${mesh}`, mesh, skin: 0 });
  }
  json.materials[0].doubleSided = true;
  json.buffers[0].byteLength = bin.length;
  json.asset.generator = "Rigloom original compatibility fixture v1";
  return { bytes: writeGlb(json, bin), oracle, world };
}

// Analytic two-joint linear blend reference for a single raw joint rotation.
export function posedOracle(fixture, bone, axis, angle) {
  const { json } = readGlb(fixture.bytes);
  const affected = new Set();
  function visit(n) {
    affected.add(n);
    for (const child of json.nodes[n].children ?? []) visit(child);
  }
  visit(boneNodes[bone]);
  const pivot = fixture.world[boneNodes[bone]],
    c = Math.cos(angle),
    s = Math.sin(angle);
  function point(p, key) {
    if (!affected.has(boneNodes[key])) return p;
    const q = p.map((v, i) => v - pivot[i]);
    const rotated =
      axis === "z"
        ? [c * q[0] - s * q[1], s * q[0] + c * q[1], q[2]]
        : [q[0], c * q[1] - s * q[2], s * q[1] + c * q[2]];
    return rotated.map((v, i) => v + pivot[i]);
  }
  return fixture.oracle.map(({ p, a, b, t }) =>
    point(p, a).map((v, i) => v * (1 - t) + point(p, b)[i] * t),
  );
}
