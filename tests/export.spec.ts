import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { boneNodes, requiredBones } from "../scripts/rig-fixture.mjs";
import { exportFixture, readGlb } from "../scripts/export-fixture.mjs";
import {
  loadVrmInBrowser,
  validateVrmSchemas,
} from "../scripts/vrm-validation.mjs";

const choices: Record<string, string> = {
  "Avatar permission": "everyone",
  "Commercial usage": "corporation",
  "Credit notation": "required",
  Modification: "allowModificationRedistribution",
  "Violent usage": "false",
  "Sexual usage": "false",
  "Political or religious usage": "true",
  "Antisocial or hate usage": "false",
  Redistribution: "true",
};
const authorNames = ["Rigloom test author", "Original fixture contributor"];
const sourceConfirmation =
  "Source is a T-pose humanoid facing +Z, Y-up, in meters";
const rightsConfirmation = "I can set these usage permissions";

async function upload(page: Page, bytes = exportFixture()) {
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "original-export-fixture.glb",
    mimeType: "model/gltf-binary",
    buffer: bytes,
  });
  await expect(page.locator("#mapping-status")).toContainText("Mapping valid");
  await expect(page.locator("#bind-status")).toContainText(
    "Bind/weight checks passed",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
}
async function fillMetadata(page: Page) {
  await page
    .getByLabel("Avatar name", { exact: true })
    .fill("Original fixture");
  await page
    .getByLabel("Authors (one per line)", { exact: true })
    .fill(authorNames.join("\n"));
  await page.getByLabel("Version", { exact: true }).fill("fixture-1");
  for (const [label, value] of Object.entries(choices))
    await page.getByLabel(label, { exact: true }).selectOption(value);
  await page.getByLabel(rightsConfirmation, { exact: true }).check();
  await page.getByLabel(sourceConfirmation, { exact: true }).check();
}
async function exportReady(page: Page) {
  await page
    .getByRole("button", { name: "Export VRM 1.0", exact: true })
    .click();
  await expect(page.locator("#export-status")).toContainText("VRM ready");
}
async function download(page: Page, label: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: label, exact: true }).click();
  const result = await pending;
  return {
    name: result.suggestedFilename(),
    bytes: await readFile((await result.path())!),
  };
}
async function expectNoOutput(page: Page) {
  await expect(page.locator("#save-vrm")).toBeDisabled();
  await expect(page.locator("#export-status")).not.toContainText("VRM ready");
}
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

test("requires explicit metadata and exports preserved resources accepted by pinned schemas and an independent VRM loader", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  const external: string[] = [];
  const mutations: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !request.url().startsWith("http://127.0.0.1:4173/")
    )
      external.push(request.url());
    if (["POST", "PUT", "PATCH"].includes(request.method()))
      mutations.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  const source = exportFixture({ multi: true });
  const original = readGlb(source);
  await upload(page, source);
  for (const label of Object.keys(choices))
    await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel(rightsConfirmation, { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel(sourceConfirmation, { exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Export VRM 1.0", exact: true })
    .click();
  await expectNoOutput(page);
  await page
    .getByLabel("Avatar name", { exact: true })
    .fill("Original fixture");
  await page
    .getByLabel("Authors (one per line)", { exact: true })
    .fill(authorNames[0]);
  await page
    .getByRole("button", { name: "Export VRM 1.0", exact: true })
    .click();
  await expectNoOutput(page);

  await fillMetadata(page);
  await exportReady(page);
  const output = await download(page, "Save VRM");
  expect(output.name).toBe("rigloom-avatar.vrm");
  const { json, bin } = await validateVrmSchemas(output.bytes);
  expect(bin).toEqual(original.bin);
  const expected = structuredClone(original.json);
  for (const mesh of expected.meshes) {
    for (const primitive of mesh.primitives) {
      delete primitive.attributes.TANGENT;
      for (const target of primitive.targets) delete target.TANGENT;
    }
  }
  expected.extensionsUsed = ["VRMC_vrm"];
  expected.extensions = {
    VRMC_vrm: {
      specVersion: "1.0",
      meta: {
        name: "Original fixture",
        authors: authorNames,
        version: "fixture-1",
        licenseUrl: "https://vrm.dev/licenses/1.0/",
        avatarPermission: "everyone",
        commercialUsage: "corporation",
        creditNotation: "required",
        modification: "allowModificationRedistribution",
        allowExcessivelyViolentUsage: false,
        allowExcessivelySexualUsage: false,
        allowPoliticalOrReligiousUsage: true,
        allowAntisocialOrHateUsage: false,
        allowRedistribution: true,
      },
      humanoid: {
        humanBones: Object.fromEntries(
          requiredBones.map((bone: string) => [
            bone,
            { node: boneNodes[bone] },
          ]),
        ),
      },
    },
  };
  expect(json).toEqual(expected);

  const reportDownload = await download(page, "Save conversion report");
  expect(reportDownload.name).toBe("rigloom-conversion.json");
  const report = JSON.parse(reportDownload.bytes.toString("utf8"));
  expect(report).toMatchObject({
    schema_version: 1,
    export_allowed: true,
    source_sha256: hash(source),
    output_sha256: hash(output.bytes),
    source_byte_length: source.length,
    output_byte_length: output.bytes.length,
    humanoid_bones: 15,
  });
  expect(report.changes.join("\n")).toContain("TANGENT");
  expect(report.preserved.join("\n")).toMatch(
    /1 glTF animations and 1 cameras/,
  );
  expect(report.limitations.join("\n")).toContain("not generated");
  expect(
    report.diagnostics.filter(
      (entry: { severity: string }) => entry.severity === "error",
    ),
  ).toEqual([]);

  const viewer = await context.newPage();
  try {
    const loaded = await loadVrmInBrowser(viewer, output.bytes);
    expect(loaded.meta).toMatchObject({
      metaVersion: "1",
      name: "Original fixture",
      authors: authorNames,
      licenseUrl: "https://vrm.dev/licenses/1.0/",
      avatarPermission: "everyone",
      commercialUsage: "corporation",
      modification: "allowModificationRedistribution",
      allowRedistribution: true,
    });
    expect(loaded.bones).toEqual(boneNodes);
    expect(loaded.meshes).toHaveLength(2);
    const bindAccessor = original.json.accessors[3];
    const bindOffset =
      original.json.bufferViews[bindAccessor.bufferView].byteOffset;
    const originalBinds = Array.from({ length: 15 }, (_, joint) =>
      Array.from({ length: 16 }, (_, component) =>
        original.bin.readFloatLE(bindOffset + joint * 64 + component * 4),
      ),
    );
    expect(loaded.matrices.hips).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1,
    ]);
    for (const mesh of loaded.meshes) {
      expect(mesh.skinned).toBe(true);
      expect(mesh.vertices).toBe(3);
      expect(mesh.skinWeights).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
      expect(mesh.inverseBinds).toEqual(originalBinds);
      expect(mesh.materials).toEqual([
        {
          type: "MeshStandardMaterial",
          color: [0.2, 0.4, 0.8],
          metalness: 0.2,
          roughness: 0.7,
          texture: { width: 1, height: 1 },
        },
      ]);
    }
    expect(loaded.animations).toBe(1);
  } finally {
    await viewer.close();
  }
  expect(external).toEqual([]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test("metadata edits, invalid mapping and source replacement invalidate completed downloads", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page);
  await fillMetadata(page);
  await exportReady(page);
  await page
    .getByLabel("Avatar name", { exact: true })
    .fill("Revised attribution");
  await expectNoOutput(page);
  await expect(page.locator("#save-conversion")).toBeDisabled();
  await exportReady(page);
  const revised = readGlb((await download(page, "Save VRM")).bytes);
  expect(revised.json.extensions.VRMC_vrm.meta.name).toBe(
    "Revised attribution",
  );

  await page.getByRole("button", { name: "Mapping", exact: true }).click();
  await page.getByLabel("Bone hips", { exact: true }).selectOption("");
  await expectNoOutput(page);
  await expect(page.locator("#export-vrm")).toBeDisabled();
  await page
    .getByRole("button", { name: "Validate mapping", exact: true })
    .click();
  await expect(page.locator("#diagnostics")).toContainText("mapping_required");
  await expect(page.locator("#export-vrm")).toBeDisabled();

  await upload(page, exportFixture({ variant: 1 }));
  await expectNoOutput(page);
  await expect(page.getByLabel("Avatar name", { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel("Authors (one per line)", { exact: true }),
  ).toHaveValue("");
  for (const label of Object.keys(choices))
    await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel(rightsConfirmation, { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel(sourceConfirmation, { exact: true }),
  ).not.toBeChecked();
});

test("bind-pose warnings require an explicit acknowledgement before byte-preserving export", async ({
  page,
}) => {
  await page.goto("/");
  const source = exportFixture({ defect: "bind_warning" });
  await upload(page, source);
  await expect(page.locator("#diagnostics")).toContainText("bind_rest_review");
  await fillMetadata(page);
  await page
    .getByRole("button", { name: "Export VRM 1.0", exact: true })
    .click();
  await expect(page.locator("#export-status")).toContainText("Export blocked");
  await expect(page.locator("#export-diagnostics")).toContainText(
    "bind_review_confirmation",
  );
  await expectNoOutput(page);
  await page
    .getByLabel("I reviewed the bind-pose warning", { exact: true })
    .check();
  await exportReady(page);
  const output = await download(page, "Save VRM");
  expect(readGlb(output.bytes).bin).toEqual(readGlb(source).bin);
  const report = JSON.parse(
    (await download(page, "Save conversion report")).bytes.toString("utf8"),
  );
  expect(report.limitations.join("\n")).toContain("explicitly acknowledged");
});

test("a tangent-only morph target is reported instead of silently erasing the target", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, exportFixture({ defect: "tangent_only" }));
  await fillMetadata(page);
  await page
    .getByRole("button", { name: "Export VRM 1.0", exact: true })
    .click();
  await expect(page.locator("#export-status")).toContainText("Export blocked");
  await expect(page.locator("#export-diagnostics")).toContainText(
    "tangent_only_morph",
  );
  await expectNoOutput(page);
});

test("cancelled exports cannot restore a downloadable artifact", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page);
  await fillMetadata(page);
  await page.route("**/*inspect.worker*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    await route.continue();
  });
  const pendingWorker = page.waitForRequest(/inspect\.worker/);
  await page
    .getByRole("button", { name: "Export VRM 1.0", exact: true })
    .click();
  await pendingWorker;
  await page.locator("#cancel").click();
  await expect(page.locator("#status")).toContainText("Cancelled");
  await page.waitForTimeout(700);
  await expect(page.locator("#status")).toContainText("Cancelled");
  await expectNoOutput(page);
  await expect(page.locator("#save-conversion")).toBeDisabled();
});

test("export settings stay locked during work and replacement discards pending results", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page);
  await fillMetadata(page);
  await page.route("**/*inspect.worker*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    await route.continue();
  });
  let pendingWorker = page.waitForRequest(/inspect\.worker/);
  await page
    .getByRole("button", { name: "Export VRM 1.0", exact: true })
    .click();
  await pendingWorker;
  await expect(page.getByLabel("Avatar name", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("Avatar permission", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel(rightsConfirmation, { exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#export-status")).toContainText("VRM ready");
  await page
    .getByLabel("Avatar name", { exact: true })
    .fill("Edited after export");
  await expectNoOutput(page);

  await upload(page, exportFixture({ variant: 2 }));
  await fillMetadata(page);
  pendingWorker = page.waitForRequest(/inspect\.worker/);
  await page
    .getByRole("button", { name: "Export VRM 1.0", exact: true })
    .click();
  await pendingWorker;
  await upload(page, exportFixture({ variant: 3 }));
  await page.waitForTimeout(700);
  await expectNoOutput(page);
  await expect(page.getByLabel("Avatar name", { exact: true })).toHaveValue("");
  await expect(page.locator("#save-conversion")).toBeDisabled();
});
