// Original generated test data under the repository's MIT license.
// No downloaded models, textures or motion clips are included.
import { deflateSync } from "node:zlib";
import { boneNodes, rigFixture } from "./rig-fixture.mjs";

export function readGlb(bytes) {
  const data = Buffer.from(bytes);
  if (
    data.toString("ascii", 0, 4) !== "glTF" ||
    data.readUInt32LE(4) !== 2 ||
    data.readUInt32LE(8) !== data.length ||
    data.readUInt32LE(16) !== 0x4e4f534a
  )
    throw new Error("Expected a complete GLB 2.0 fixture");
  const jsonLength = data.readUInt32LE(12);
  const binaryHeader = 20 + jsonLength;
  if (
    data.readUInt32LE(binaryHeader + 4) !== 0x004e4942 ||
    binaryHeader + 8 + data.readUInt32LE(binaryHeader) !== data.length
  )
    throw new Error("Expected one BIN chunk");
  return {
    json: JSON.parse(data.toString("utf8", 20, binaryHeader)),
    bin: Buffer.from(data.subarray(binaryHeader + 8)),
  };
}

export function writeGlb(json, bin) {
  const encoded = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32);
  encoded.copy(jsonChunk);
  const binaryChunk = Buffer.alloc(Math.ceil(bin.length / 4) * 4);
  Buffer.from(bin).copy(binaryChunk);
  const output = Buffer.alloc(28 + jsonChunk.length + binaryChunk.length);
  output.write("glTF");
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonChunk.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(output, 20);
  output.writeUInt32LE(binaryChunk.length, 20 + jsonChunk.length);
  output.writeUInt32LE(0x004e4942, 24 + jsonChunk.length);
  binaryChunk.copy(output, 28 + jsonChunk.length);
  return output;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), chunk.length - 4);
  return chunk;
}

// A single authored RGBA pixel. Encoding it here makes its provenance explicit.
function originalPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.from([0, 128, 192, 255, 255]))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function exportFixture({
  variant = 0,
  defect = "",
  multi = false,
} = {}) {
  const { json, bin: originalBin } = readGlb(rigFixture({ variant, multi }));
  for (const node of json.nodes) {
    if (node.children?.length === 0) delete node.children;
  }
  let bin = originalBin;
  function append(bytes) {
    const offset = Math.ceil(bin.length / 4) * 4;
    bin = Buffer.concat([bin, Buffer.alloc(offset - bin.length), bytes]);
    const bufferView = json.bufferViews.length;
    json.bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: bytes.length,
    });
    return bufferView;
  }
  function floats(values, type, count, bounds = {}) {
    const bytes = Buffer.alloc(values.length * 4);
    values.forEach((value, index) => bytes.writeFloatLE(value, index * 4));
    const accessor = json.accessors.length;
    json.accessors.push({
      bufferView: append(bytes),
      componentType: 5126,
      type,
      count,
      ...bounds,
    });
    return accessor;
  }

  const normal = floats([0, 0, 1, 0, 0, 1, 0, 0, 1], "VEC3", 3);
  const uv = floats([0, 0, 1, 0, 0.5, 1], "VEC2", 3);
  const tangent = floats([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1], "VEC4", 3);
  const morphPosition = floats(
    [0, 0, 0.05, 0, 0, 0.05, 0, 0.1, 0.05],
    "VEC3",
    3,
    { min: [0, 0, 0.05], max: [0, 0.1, 0.05] },
  );
  const morphNormal = floats([0, 0, 0, 0, 0, 0, 0, 0, 0], "VEC3", 3);
  const morphTangent = floats([0, 0, 0, 0, 0, 0, 0, 0, 0], "VEC3", 3);
  for (const mesh of json.meshes) {
    const primitive = mesh.primitives[0];
    Object.assign(primitive.attributes, {
      NORMAL: normal,
      TEXCOORD_0: uv,
      TANGENT: tangent,
    });
    primitive.material = 0;
    primitive.targets = [
      defect === "tangent_only"
        ? { TANGENT: morphTangent }
        : {
            POSITION: morphPosition,
            NORMAL: morphNormal,
            TANGENT: morphTangent,
          },
    ];
    mesh.weights = [0.25];
    mesh.extras = {
      targetNames: ["Original lift"],
      note: "Preserve this extra",
    };
  }
  json.images = [{ bufferView: append(originalPng()), mimeType: "image/png" }];
  json.samplers = [
    { magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071 },
  ];
  json.textures = [{ sampler: 0, source: 0, name: "Original pixel" }];
  json.materials = [
    {
      name: "Original PBR",
      pbrMetallicRoughness: {
        baseColorFactor: [0.2, 0.4, 0.8, 1],
        baseColorTexture: { index: 0 },
        metallicFactor: 0.2,
        roughnessFactor: 0.7,
      },
      normalTexture: { index: 0, scale: 0.5 },
      emissiveFactor: [0.01, 0.02, 0.03],
      doubleSided: true,
      extras: { origin: "Rigloom generated fixture" },
    },
  ];

  const time = floats([0, 1], "SCALAR", 2, { min: [0], max: [1] });
  const translation = floats([0, 0.5, 0, 0, 0.6, 0], "VEC3", 2);
  json.animations = [
    {
      name: "Original head lift",
      samplers: [{ input: time, output: translation, interpolation: "LINEAR" }],
      channels: [
        {
          sampler: 0,
          target: { node: boneNodes.head, path: "translation" },
        },
      ],
    },
  ];
  json.cameras = [
    {
      name: "Original camera",
      type: "perspective",
      perspective: { aspectRatio: 1, yfov: 0.7, znear: 0.1, zfar: 20 },
    },
  ];
  json.nodes[0].children.push(json.nodes.length);
  json.nodes.push({
    name: "Camera node",
    camera: 0,
    translation: [0, 2, 5],
  });
  json.extras = { originalFixture: true, preserveUnknownMetadata: ["a", 7] };
  if (defect === "bind_warning") {
    // Change only one invertible inverse-bind translation. The numeric skin
    // remains valid while joint-world × inverse-bind products no longer agree.
    const view = json.bufferViews[json.accessors[3].bufferView];
    const offset = view.byteOffset + 12 * 4;
    bin.writeFloatLE(bin.readFloatLE(offset) + 0.125, offset);
  }
  json.buffers[0].byteLength = bin.length;
  return writeGlb(json, bin);
}
