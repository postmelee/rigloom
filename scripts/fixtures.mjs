// Original synthetic geometry generated at test time; no downloaded assets.
import { mkdir, writeFile } from "node:fs/promises";
export function fixture({
  rigged = false,
  external = false,
  extension = false,
  multi = false,
} = {}) {
  const binary = Buffer.alloc(rigged ? 120 : 36);
  [-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0].forEach((n, i) =>
    binary.writeFloatLE(n, i * 4),
  );
  if (rigged) {
    for (let i = 0; i < 3; i++) binary.writeFloatLE(1, 72 + i * 16);
  }
  const json = {
    asset: { version: "2.0", generator: "Rigloom original synthetic fixture" },
    scene: 0,
    scenes: [{ nodes: rigged ? [0, 1] : multi ? [0, 1] : [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-0.5, 0, 0],
        max: [0.5, 1, 0],
      },
    ],
  };
  if (multi) {
    json.meshes.push(structuredClone(json.meshes[0]));
    json.nodes.push({ mesh: 1, translation: [1, 0, 0] });
  }
  if (rigged) {
    json.nodes[0].skin = 0;
    json.nodes.push({ name: "syntheticRoot" });
    json.skins = [{ joints: [1] }];
    json.meshes[0].primitives[0].attributes.JOINTS_0 = 1;
    json.meshes[0].primitives[0].attributes.WEIGHTS_0 = 2;
    json.bufferViews.push(
      { buffer: 0, byteOffset: 36, byteLength: 24 },
      { buffer: 0, byteOffset: 72, byteLength: 48 },
    );
    json.accessors.push(
      { bufferView: 1, componentType: 5123, count: 3, type: "VEC4" },
      { bufferView: 2, componentType: 5126, count: 3, type: "VEC4" },
    );
  }
  if (external)
    json.buffers[0].uri = "https://example.invalid/private-model.bin";
  if (extension) json.extensionsUsed = ["KHR_draco_mesh_compression"];
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
if (process.argv[1]?.endsWith("fixtures.mjs")) {
  await mkdir(".local/fixtures", { recursive: true });
  for (const [name, options] of [
    ["surface", {}],
    ["rigged", { rigged: true }],
    ["multi", { multi: true }],
    ["external", { external: true }],
    ["extension", { extension: true }],
  ])
    await writeFile(`.local/fixtures/${name}.glb`, fixture(options));
}
