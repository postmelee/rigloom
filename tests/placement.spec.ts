import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unriggedFixture } from "../scripts/unrigged-fixture.mjs";
import { exportFixture } from "../scripts/export-fixture.mjs";
const upload = async (page: any, bytes = unriggedFixture()) => {
  await page.goto("/");
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "unrigged.glb",
    mimeType: "model/gltf-binary",
    buffer: bytes,
  });
  await page.getByRole("button", { name: "Rig", exact: true }).click();
};
test("placement mirrors depth edits, undoes, restores source-bound files and validates", async ({
  page,
}) => {
  await upload(page);
  await expect(page.locator("#rig-status")).toContainText("Place joints");
  await page.locator("#rig-joint").selectOption("10");
  await page.getByLabel("Joint Z", { exact: true }).fill("0.123");
  await page.getByLabel("Joint Z", { exact: true }).press("Tab");
  await page.locator("#rig-joint").selectOption("13");
  await expect(page.getByLabel("Joint Z", { exact: true })).toHaveValue(
    "0.123",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Joint Z", { exact: true })).toHaveValue("0");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Joint Z", { exact: true })).toHaveValue(
    "0.123",
  );
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save placement", exact: true })
    .click();
  const bytes = await readFile((await (await pending).path())!);
  await page.getByRole("button", { name: "Reset all", exact: true }).click();
  await expect(page.getByLabel("Joint Z", { exact: true })).toHaveValue("0");
  await page.getByLabel("Load placement", { exact: true }).setInputFiles({
    name: "placement.json",
    mimeType: "application/json",
    buffer: bytes,
  });
  await expect(page.locator("#rig-status")).toContainText(
    "Joint checks passed",
  );
  await expect(page.getByLabel("Joint Z", { exact: true })).toHaveValue(
    "0.123",
  );
  const invalid = JSON.parse(bytes.toString());
  invalid.source_sha256 = "0".repeat(64);
  await page.getByLabel("Load placement", { exact: true }).setInputFiles({
    name: "other.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await expect(page.locator("#rig-status")).toContainText("different source");
  await page.locator("#rig-joint").selectOption("2");
  await page.getByLabel("Joint Y", { exact: true }).fill("0");
  await page.getByLabel("Joint Y", { exact: true }).press("Tab");
  await page
    .getByRole("button", { name: "Validate joints", exact: true })
    .click();
  await expect(page.locator("#rig-status")).toContainText("Head must be above");
});
test("frame preparation is undoable and existing skins stay on preservation path", async ({
  page,
}) => {
  await upload(page);
  await expect(page.locator("#rig-status")).toContainText("Place joints");
  const y = await page.getByLabel("Joint Y", { exact: true }).inputValue();
  await page.getByText("Model frame", { exact: true }).click();
  await page.getByLabel("Meters per source unit", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Apply frame", exact: true }).click();
  await expect(page.getByLabel("Joint Y", { exact: true })).not.toHaveValue(y);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Joint Y", { exact: true })).toHaveValue(y);
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "rigged.glb",
    mimeType: "model/gltf-binary",
    buffer: exportFixture(),
  });
  await expect(page.locator("#mapping-status")).toContainText("Mapping valid");
  await page.getByRole("button", { name: "Rig", exact: true }).click();
  await expect(page.locator("#rig-validate")).toBeDisabled();
});
