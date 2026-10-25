import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { unriggedFixture } from "../scripts/unrigged-fixture.mjs";
import { readGlb } from "../scripts/export-fixture.mjs";
import {
  validateVrmSchemas,
  loadVrmInBrowser,
} from "../scripts/vrm-validation.mjs";
async function upload(page: Page, variant = "standard") {
  await page.goto("/");
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: `unrigged-${variant}.glb`,
    mimeType: "model/gltf-binary",
    buffer: unriggedFixture(variant),
  });
  await page.getByRole("button", { name: "Rig", exact: true }).click();
  await expect(page.locator("#rig-status")).toContainText("Place joints");
}
async function generate(page: Page) {
  await page
    .getByRole("button", { name: "Generate weights", exact: true })
    .click();
  await expect(page.locator("#rig-status")).toContainText(
    "Preview · 120 vertices",
    { timeout: 15000 },
  );
  await expect(page.locator("#bind-status")).toContainText(
    "Bind/weight checks passed",
  );
}
async function download(page: Page, label: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: label, exact: true }).click();
  return readFile((await (await pending).path())!);
}
async function metadata(page: Page) {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByLabel("Avatar name", { exact: true })
    .fill("Original generated test");
  await page
    .getByLabel("Authors (one per line)", { exact: true })
    .fill("Rigloom test fixture author");
  for (const [label, value] of Object.entries({
    "Avatar permission": "onlyAuthor",
    "Commercial usage": "personalNonProfit",
    "Credit notation": "required",
    Modification: "prohibited",
    "Violent usage": "false",
    "Sexual usage": "false",
    "Political or religious usage": "false",
    "Antisocial or hate usage": "false",
    Redistribution: "false",
  }))
    await page.getByLabel(label, { exact: true }).selectOption(value);
  await page
    .getByLabel("I can set these usage permissions", { exact: true })
    .check();
  await page
    .getByLabel("Source is a T-pose humanoid facing +Z, Y-up, in meters", {
      exact: true,
    })
    .check();
}
for (const variant of ["standard", "short-wide", "asymmetric"])
  test(`unrigged ${variant} generates repeatable skin and valid VRM with editable source retained`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await upload(page, variant);
    await generate(page);
    await expect(page.getByLabel("Joint X", { exact: true })).toBeDisabled();
    const rigged = await download(page, "Save rigged GLB");
    const generated = readGlb(rigged),
      original = readGlb(unriggedFixture(variant));
    expect(generated.bin.subarray(0, original.bin.length)).toEqual(
      original.bin,
    );
    expect(generated.json.materials).toEqual(original.json.materials);
    const report = JSON.parse(
      (await download(page, "Save weight report")).toString(),
    );
    expect(report.unweighted_vertices).toBe(0);
    expect(report.max_weight_sum_error).toBeLessThan(1e-6);
    expect(report.components).toHaveLength(10);
    await page.getByLabel("Angle", { exact: true }).press("End");
    await expect(page.locator("#rig-angle-value")).toHaveText("120°");
    // Preview poses are never baked into the exported rest GLB.
    expect(await download(page, "Save rigged GLB")).toEqual(rigged);
    await metadata(page);
    await page
      .getByRole("button", { name: "Export VRM 1.0", exact: true })
      .click();
    await expect(page.locator("#export-status")).toContainText("VRM ready");
    const vrm = await download(page, "Save VRM");
    await validateVrmSchemas(vrm);
    const viewer = await context.newPage();
    try {
      const loaded = await loadVrmInBrowser(viewer, vrm);
      expect(Object.keys(loaded.bones)).toHaveLength(15);
      expect(loaded.meshes).toHaveLength(10);
      expect(loaded.meshes.every((m: any) => m.skinned)).toBe(true);
    } finally {
      await viewer.close();
    }
    if (variant === "standard") {
      await mkdir(".local/initial-skin", { recursive: true });
      await writeFile(".local/initial-skin/generated.vrm", vrm);
      await writeFile(".local/initial-skin/generated.glb", rigged);
    }
    await page.getByRole("button", { name: "Rig", exact: true }).click();
    await page
      .getByRole("button", { name: "Edit joints", exact: true })
      .click();
    await expect(page.getByLabel("Joint X", { exact: true })).toBeEnabled();
    await expect(page.locator("#save-vrm")).toBeDisabled();
    await expect(page.locator("#rig-preview")).toBeHidden();
    await generate(page);
    expect(await download(page, "Save rigged GLB")).toEqual(rigged);
    expect(errors).toEqual([]);
  });
test("rigid attachment survives saved placement and changed joints require regeneration", async ({
  page,
}) => {
  await upload(page);
  await page.getByText("Initial weights", { exact: true }).click();
  await page.getByLabel("Attachment", { exact: true }).selectOption("11");
  const saved = await download(page, "Save placement");
  await generate(page);
  let report = JSON.parse(
    (await download(page, "Save weight report")).toString(),
  );
  expect(report.rigid).toEqual({ "0:0:0": 11 });
  await page.getByRole("button", { name: "Edit joints", exact: true }).click();
  await page.getByLabel("Attachment", { exact: true }).selectOption("");
  await page.getByLabel("Load placement", { exact: true }).setInputFiles({
    name: "placement.json",
    mimeType: "application/json",
    buffer: saved,
  });
  await expect(page.locator("#rig-status")).toContainText(
    "Joint checks passed",
  );
  await expect(page.getByLabel("Attachment", { exact: true })).toHaveValue(
    "11",
  );
  await page.locator("#rig-joint").selectOption("2");
  await page.getByLabel("Joint Y", { exact: true }).fill("0");
  await page.getByLabel("Joint Y", { exact: true }).press("Tab");
  await page
    .getByRole("button", { name: "Generate weights", exact: true })
    .click();
  await expect(page.locator("#rig-status")).toContainText("Head must be above");
  await expect(page.locator("#rig-preview")).toBeHidden();
});
test("cancelled generation and source replacement cannot resurrect output", async ({
  page,
}) => {
  await upload(page);
  await page.route("**/*rig.worker*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  let pending = page.waitForRequest(/rig\.worker/);
  await page
    .getByRole("button", { name: "Generate weights", exact: true })
    .click();
  await pending;
  await page.locator("#rig-cancel").click();
  await expect(page.locator("#rig-status")).toContainText("Cancelled");
  await page.waitForTimeout(700);
  await expect(page.locator("#rig-preview")).toBeHidden();
  await expect(page.getByLabel("Joint X", { exact: true })).toBeEnabled();
  pending = page.waitForRequest(/rig\.worker/);
  await page
    .getByRole("button", { name: "Generate weights", exact: true })
    .click();
  await pending;
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "replacement.glb",
    mimeType: "model/gltf-binary",
    buffer: unriggedFixture("asymmetric"),
  });
  await page.getByRole("button", { name: "Rig", exact: true }).click();
  await expect(page.locator("#rig-status")).toContainText("Place joints");
  await page.waitForTimeout(700);
  await expect(page.locator("#rig-preview")).toBeHidden();
  await expect(page.locator("#save-vrm")).toBeDisabled();
});
