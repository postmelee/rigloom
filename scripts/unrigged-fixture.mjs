// Original compatibility geometry with the existing rig deliberately removed.
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { humanoidFixture } from "./compatibility/fixture.mjs";
import { readGlb, writeGlb } from "./export-fixture.mjs";
export function unriggedFixture(variant = "standard") {
  const { json, bin } = readGlb(humanoidFixture(variant).bytes);
  delete json.skins;
  json.nodes = json.meshes.map((m, mesh) => ({
    name: m.name ?? `part-${mesh}`,
    mesh,
  }));
  json.scenes = [{ nodes: json.nodes.map((_, i) => i) }];
  for (const mesh of json.meshes)
    for (const p of mesh.primitives) {
      delete p.attributes.JOINTS_0;
      delete p.attributes.WEIGHTS_0;
    }
  return writeGlb(json, bin);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await mkdir(".local/initial-skin", { recursive: true });
  for (const variant of ["standard", "short-wide", "asymmetric"])
    await writeFile(
      `.local/initial-skin/unrigged-${variant}.glb`,
      unriggedFixture(variant),
    );
  console.log("Created three original unrigged GLBs in .local/initial-skin/");
}
