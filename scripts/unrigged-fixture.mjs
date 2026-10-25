// Original compatibility geometry with the existing rig deliberately removed.
import { humanoidFixture } from "./compatibility/fixture.mjs";
import { readGlb, writeGlb } from "./export-fixture.mjs";
export function unriggedFixture(variant = "standard") {
  const { json, bin } = readGlb(humanoidFixture(variant).bytes);
  delete json.skins;
  json.nodes = json.meshes.map((_, mesh) => ({ name: `part-${mesh}`, mesh }));
  json.scenes = [{ nodes: json.nodes.map((_, i) => i) }];
  for (const mesh of json.meshes)
    for (const p of mesh.primitives) {
      delete p.attributes.JOINTS_0;
      delete p.attributes.WEIGHTS_0;
    }
  return writeGlb(json, bin);
}
