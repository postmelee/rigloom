import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { unriggedFixture } from "../scripts/unrigged-fixture.mjs";
import { readGlb, writeGlb } from "../scripts/export-fixture.mjs";
import { accessor } from "../scripts/quality/real-model.mjs";
async function download(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return readFile((await (await pending).path())!);
}
async function generate(page: Page) {
  await page
    .getByRole("button", { name: /^(Preview deformation|Update preview)$/ })
    .click();
  await expect(page.locator("#rig-preview")).toBeVisible();
  return download(page, "Save rigged GLB");
}
function fragmented() {
  const { json, bin } = readGlb(unriggedFixture());
  // Original fixture: four disconnected triangles in one primitive, another
  // primitive and a reused mesh instance. Group membership must use BOTH IDs.
  delete json.meshes[0].primitives[0].indices;
  json.meshes[0].primitives.push(structuredClone(json.meshes[0].primitives[0]));
  json.nodes.push({
    name: "Second instance",
    mesh: 0,
    translation: [0, 0, 0.5],
  });
  json.scenes[0].nodes.push(json.nodes.length - 1);
  return writeGlb(json, bin);
}
test("surface attachment corrects all fragments without changing another primitive or instance", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "fragmented.glb",
    mimeType: "model/gltf-binary",
    buffer: fragmented(),
  });
  await page.getByRole("button", { name: "Rig", exact: true }).click();
  await expect(page.locator("#rig-status")).toContainText("Place joints");
  const baseline = await generate(page);
  await page.getByRole("button", { name: "Edit joints", exact: true }).click();
  await page.getByText("Initial weights", { exact: true }).click();
  await expect(page.getByLabel("Select by", { exact: true })).toHaveValue(
    "surface",
  );
  await page
    .getByLabel("Attachment target", { exact: true })
    .selectOption("surface:0:0");
  await expect(page.locator("#rig-part-summary")).toContainText("4 part(s)");
  await page.getByLabel("Attachment", { exact: true }).selectOption("1");
  let saved = JSON.parse((await download(page, "Save placement")).toString());
  expect(saved.rigid).toEqual(
    Object.fromEntries([0, 1, 2, 3].map((i) => [`0:0:${i}`, 1])),
  );
  await page.getByLabel("Select by", { exact: true }).selectOption("component");
  await page
    .getByLabel("Attachment target", { exact: true })
    .selectOption("0:0:1");
  await page.getByLabel("Attachment", { exact: true }).selectOption("2");
  await page.getByLabel("Select by", { exact: true }).selectOption("surface");
  await page
    .getByLabel("Attachment target", { exact: true })
    .selectOption("surface:0:0");
  await expect(page.getByLabel("Attachment", { exact: true })).toHaveValue(
    "mixed",
  );
  await page.getByLabel("Attachment", { exact: true }).selectOption("1");
  await page.getByLabel("Attachment", { exact: true }).scrollIntoViewIfNeeded();
  await mkdir(".local", { recursive: true });
  await page.screenshot({ path: ".local/attachment-group.png" });
  const corrected = await generate(page);
  const report = JSON.parse(
    (await download(page, "Save weight report")).toString(),
  );
  expect(report.rigid).toEqual(saved.rigid);
  expect(report.unweighted_vertices).toBe(0);
  const before = readGlb(baseline),
    after = readGlb(corrected);
  for (const [nodeId, node] of after.json.nodes.entries()) {
    if (node.mesh === undefined) continue;
    const oldNode = before.json.nodes[nodeId];
    for (const [pi, p] of after.json.meshes[node.mesh].primitives.entries()) {
      const oldP = before.json.meshes[oldNode.mesh].primitives[pi];
      const ids = accessor(after.json, after.bin, p.attributes.JOINTS_0),
        ws = accessor(after.json, after.bin, p.attributes.WEIGHTS_0);
      if (nodeId === 0 && pi === 0) {
        for (let v = 0; v < ws.length; v++) {
          expect(ws[v]).toEqual([1, 0, 0, 0]);
          expect(ids[v][0]).toBe(1);
        }
      } else {
        expect(ids).toEqual(
          accessor(before.json, before.bin, oldP.attributes.JOINTS_0),
        );
        expect(ws).toEqual(
          accessor(before.json, before.bin, oldP.attributes.WEIGHTS_0),
        );
      }
    }
  }
  await page.getByRole("button", { name: "Edit joints", exact: true }).click();
  await page.getByLabel("Attachment", { exact: true }).selectOption("");
  expect(
    JSON.parse((await download(page, "Save placement")).toString()).rigid,
  ).toEqual({});
  expect(await generate(page)).toEqual(baseline);
  await page.getByRole("button", { name: "Edit joints", exact: true }).click();
  await page.getByLabel("Load placement", { exact: true }).setInputFiles({
    name: "placement.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await expect(page.locator("#rig-status")).toContainText(
    "Joint checks passed",
  );
  expect(await generate(page)).toEqual(corrected);
  await page.getByRole("button", { name: "Edit joints", exact: true }).click();
  await page.route("**/*rig.worker*", async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Update preview", exact: true })
    .click();
  await page.locator("#rig-cancel").click();
  await expect(page.locator("#rig-status")).toContainText("Cancelled");
  await expect(page.locator("#rig-preview")).toBeHidden();
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "new.glb",
    mimeType: "model/gltf-binary",
    buffer: unriggedFixture(),
  });
  await page.getByRole("button", { name: "Place joints", exact: true }).click();
  await expect(page.locator("#rig-status")).toContainText("Place joints");
  expect(
    JSON.parse((await download(page, "Save placement")).toString()).rigid,
  ).toEqual({});
});
