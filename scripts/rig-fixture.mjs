// Original, deterministic humanoid geometry. No external model or motion data.
export const requiredBones = [
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
export const boneNodes = Object.fromEntries(
  requiredBones.map((bone, index) => [bone, index + 2]),
);

export function rigFixture({ multi = false, defect = "", variant = 0 } = {}) {
  // Each joint has a distinct local position. A translated/scaled helper tests
  // world-transform composition without reusing the validator's matrix code.
  const descriptions = [
    ["hips", null, [0, 1, 0]],
    ["spine", "hips", [0, 0.3, 0]],
    ["head", "spine", [0, 0.5, 0]],
    ["leftUpperLeg", "hips", [0.15, -0.1, 0]],
    ["leftLowerLeg", "leftUpperLeg", [0, -0.4, 0]],
    ["leftFoot", "leftLowerLeg", [0, -0.4, 0.1]],
    ["rightUpperLeg", "hips", [-0.15, -0.1, 0]],
    ["rightLowerLeg", "rightUpperLeg", [0, -0.4, 0]],
    ["rightFoot", "rightLowerLeg", [0, -0.4, 0.1]],
    ["leftUpperArm", "spine", [0.2, 0.2, 0]],
    ["leftLowerArm", "leftUpperArm", [0.35, 0, 0]],
    ["leftHand", "leftLowerArm", [0.3, 0, 0]],
    ["rightUpperArm", "spine", [-0.2, 0.2, 0]],
    ["rightLowerArm", "rightUpperArm", [-0.35, 0, 0]],
    ["rightHand", "rightLowerArm", [-0.3, 0, 0]],
  ];
  const nodes = [
    {
      name: "scene helper",
      translation: [2, 3, 4],
      scale: [2, 2, 2],
      children: [1, boneNodes.hips],
    },
    { name: "surface", mesh: 0, skin: 0 },
    ...descriptions.map(([name, , translation]) => ({
      name,
      translation,
      children: [],
    })),
  ];
  const accumulated = {};
  for (const [bone, parent, translation] of descriptions) {
    const parentPosition = parent ? accumulated[parent] : [0, 0, 0];
    accumulated[bone] = translation.map((v, i) => v + parentPosition[i]);
    if (parent) nodes[boneNodes[parent]].children.push(boneNodes[bone]);
  }
  if (multi) {
    nodes[0].children.push(nodes.length);
    nodes.push({
      name: "second surface",
      mesh: 1,
      skin: 0,
      translation: [2, 0, 0],
    });
  }
  if (defect === "hierarchy") {
    nodes[boneNodes.spine].children = nodes[boneNodes.spine].children.filter(
      (node) => node !== boneNodes.leftUpperArm,
    );
    nodes[boneNodes.leftUpperLeg].children.push(boneNodes.leftUpperArm);
  }

  const inverseBindOffset = 120;
  const binary = Buffer.alloc(
    inverseBindOffset +
      requiredBones.length * 64 +
      (defect === "extra_influences" ? 72 : 0),
  );
  [-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0].forEach((value, index) =>
    binary.writeFloatLE(value, index * 4),
  );
  for (let vertex = 0; vertex < 3; vertex++) {
    binary.writeFloatLE(1, 72 + vertex * 16);
  }
  for (const [index, bone] of requiredBones.entries()) {
    const p = accumulated[bone];
    const inverse = [
      0.5,
      0,
      0,
      0,
      0,
      0.5,
      0,
      0,
      0,
      0,
      0.5,
      0,
      -1 - p[0],
      -1.5 - p[1],
      -2 - p[2],
      1,
    ];
    inverse.forEach((value, component) =>
      binary.writeFloatLE(
        value,
        inverseBindOffset + index * 64 + component * 4,
      ),
    );
  }
  if (defect === "nan_weight") binary.writeFloatLE(NaN, 72);
  if (defect === "negative_weight") binary.writeFloatLE(-1, 72);
  if (defect === "weight_sum") binary.writeFloatLE(0.5, 72);
  if (defect === "joint_index") binary.writeUInt16LE(15, 36);

  const primitive = { attributes: { POSITION: 0, JOINTS_0: 1, WEIGHTS_0: 2 } };
  const json = {
    asset: {
      version: "2.0",
      generator: "Rigloom original humanoid fixture",
      extras: { variant },
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes: [{ primitives: [primitive] }],
    skins: [
      { skeleton: 0, joints: Object.values(boneNodes), inverseBindMatrices: 3 },
    ],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 24 },
      { buffer: 0, byteOffset: 72, byteLength: 48 },
      {
        buffer: 0,
        byteOffset: inverseBindOffset,
        byteLength: requiredBones.length * 64,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-0.5, 0, 0],
        max: [0.5, 1, 0],
      },
      { bufferView: 1, componentType: 5123, count: 3, type: "VEC4" },
      { bufferView: 2, componentType: 5126, count: 3, type: "VEC4" },
      {
        bufferView: 3,
        componentType: 5126,
        count: requiredBones.length,
        type: "MAT4",
      },
    ],
  };
  if (multi) json.meshes.push({ primitives: [structuredClone(primitive)] });
  if (defect === "bind_layout") json.accessors[3].type = "VEC4";
  if (defect === "bind_count") json.accessors[3].count--;
  if (defect === "empty_skin") json.skins.push({ joints: [] });
  if (defect === "matrix_conflict")
    nodes[boneNodes.hips].matrix = [
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ];
  if (defect === "shear") {
    delete nodes[boneNodes.hips].translation;
    nodes[boneNodes.hips].matrix = [
      1, 0, 0, 0, 0.5, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1,
    ];
  }
  if (defect === "singular_mesh") nodes[1].scale = [0, 1, 1];
  if (defect === "bind_stride") json.bufferViews[3].byteStride = 64;
  if (defect === "extra_influences") {
    const offset = inverseBindOffset + requiredBones.length * 64;
    json.bufferViews.push(
      { buffer: 0, byteOffset: offset, byteLength: 24 },
      { buffer: 0, byteOffset: offset + 24, byteLength: 48 },
    );
    json.accessors.push(
      { bufferView: 4, componentType: 5123, count: 3, type: "VEC4" },
      { bufferView: 5, componentType: 5126, count: 3, type: "VEC4" },
    );
    primitive.attributes.JOINTS_1 = 4;
    primitive.attributes.WEIGHTS_1 = 5;
    for (let vertex = 0; vertex < 3; vertex++) {
      binary.writeFloatLE(0.5, 72 + vertex * 16);
      binary.writeUInt16LE(1, offset + vertex * 8);
      binary.writeFloatLE(0.5, offset + 24 + vertex * 16);
    }
  }

  const raw = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 32);
  raw.copy(padded);
  const out = Buffer.alloc(28 + padded.length + binary.length);
  out.write("glTF");
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(padded.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(out, 20);
  out.writeUInt32LE(binary.length, 20 + padded.length);
  out.writeUInt32LE(0x004e4942, 24 + padded.length);
  binary.copy(out, 28 + padded.length);
  return out;
}
