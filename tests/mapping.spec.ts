import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  boneNodes,
  requiredBones,
  rigFixture,
} from "../scripts/rig-fixture.mjs";

const uploadRig = async (page: Page, options = {}) => {
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "humanoid.glb",
    mimeType: "model/gltf-binary",
    buffer: rigFixture(options),
  });
  await page.getByRole("button", { name: "Mapping", exact: true }).click();
};
const loadMapping = (page: Page, artifact: unknown) =>
  page.getByLabel("Load mapping", { exact: true }).setInputFiles({
    name: "mapping.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(artifact)),
  });
async function saveMapping(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save mapping", exact: true }).click();
  const download = await pending;
  return JSON.parse(await readFile((await download.path())!, "utf8"));
}
const expectValid = async (page: Page) => {
  await expect(page.locator("#mapping-status")).toContainText("Mapping valid");
  await expect(page.locator("#bind-status")).toContainText(
    "Bind/weight checks passed",
  );
};

test("reviews transformed multi-mesh rigs and round-trips source-bound mapping data", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !request.url().startsWith("http://127.0.0.1:4173/")
    )
      external.push(request.url());
  });
  await page.goto("/");
  await uploadRig(page, { multi: true });
  await expectValid(page);
  for (const bone of requiredBones)
    await expect(page.getByLabel(`Bone ${bone}`, { exact: true })).toHaveValue(
      String(boneNodes[bone]),
    );
  const saved = await saveMapping(page);
  expect(saved.schema_version).toBe(1);
  expect(saved.source_sha256).toBe(
    createHash("sha256")
      .update(rigFixture({ multi: true }))
      .digest("hex"),
  );
  for (const bone of requiredBones)
    expect(saved.mapping[bone]).toBe(boneNodes[bone]);

  await page
    .getByLabel("Bone leftUpperArm", { exact: true })
    .selectOption(String(boneNodes.rightUpperArm));
  await expect(page.locator("#mapping-status")).toHaveText(
    "Mapping changed. Validate to apply.",
  );
  await expect(
    page.getByRole("button", { name: "Save mapping", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#report")).toBeDisabled();
  await page
    .getByRole("button", { name: "Validate mapping", exact: true })
    .click();
  await expect(page.locator("#diagnostics")).toContainText("mapping_duplicate");
  await expect(page.locator("#mapping-status")).not.toContainText(
    "Mapping valid",
  );

  await loadMapping(page, saved);
  await page
    .getByRole("button", { name: "Validate mapping", exact: true })
    .click();
  await expectValid(page);
  expect((await saveMapping(page)).mapping).toEqual(saved.mapping);
  expect(external).toEqual([]);
});

test("rejects mismatched source identity and malformed mapping data without replacing reviewed selections", async ({
  page,
}) => {
  await page.goto("/");
  await uploadRig(page);
  await expectValid(page);
  const saved = await saveMapping(page);
  await loadMapping(page, { ...saved, source_sha256: "0".repeat(64) });
  await expect(page.locator("#mapping-message")).toContainText(
    "Mapping belongs to a different GLB.",
  );
  await expect(page.getByLabel("Bone hips", { exact: true })).toHaveValue(
    String(boneNodes.hips),
  );
  for (const malformed of [
    { ...saved, schema_version: 999 },
    { ...saved, mapping: { hips: -1 } },
    { ...saved, mapping: { hips: "2" } },
    { ...saved, mapping: { hips: 2, unknownBone: 3 } },
  ]) {
    await loadMapping(page, malformed);
    await expect(page.locator("#mapping-message")).toContainText(
      "Could not load mapping:",
    );
    await expect(page.getByLabel("Bone hips", { exact: true })).toHaveValue(
      String(boneNodes.hips),
    );
  }
  await uploadRig(page, { variant: 1 });
  await expectValid(page);
  await loadMapping(page, saved);
  await expect(page.locator("#mapping-message")).toContainText(
    "Mapping belongs to a different GLB.",
  );
});

test("reports malformed weights, joint indices and inverse-bind layouts in release WASM", async ({
  page,
}) => {
  await page.goto("/");
  for (const [defect, code] of [
    ["nan_weight", "weights_nonfinite"],
    ["negative_weight", "weights_negative"],
    ["weight_sum", "weights_sum"],
    ["joint_index", "joint_index_bounds"],
    ["bind_layout", "inverse_bind_layout"],
    ["bind_count", "inverse_bind_count"],
  ]) {
    await uploadRig(page, { defect });
    await expect(page.locator("#bind-status")).toContainText(
      "Bind/weight checks failed",
    );
    await expect(page.locator("#diagnostics")).toContainText(code);
    await expect(page.locator("#report")).toBeEnabled();
  }
  await uploadRig(page);
  await expectValid(page);
});

test("hierarchy errors, unassigned overrides and replacement cannot keep stale mapping approval", async ({
  page,
}) => {
  await page.goto("/");
  await uploadRig(page, { defect: "hierarchy" });
  await expect(page.locator("#diagnostics")).toContainText("mapping_hierarchy");
  await uploadRig(page);
  await expectValid(page);
  await page.getByLabel("Bone hips", { exact: true }).selectOption("");
  await page
    .getByRole("button", { name: "Validate mapping", exact: true })
    .click();
  await expect(page.locator("#diagnostics")).toContainText("mapping_required");
  const saved = await saveMapping(page);
  expect(saved.mapping.hips).toBeNull();
  await uploadRig(page, { variant: 1 });
  await expectValid(page);
  await expect(page.getByLabel("Bone hips", { exact: true })).toHaveValue(
    String(boneNodes.hips),
  );
});

test("cancelling mapping validation discards the pending worker result", async ({
  page,
}) => {
  await page.goto("/");
  await uploadRig(page);
  await expectValid(page);
  await page.route("**/*inspect.worker*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 450));
    await route.continue();
  });
  await page.getByLabel("Bone hips", { exact: true }).selectOption("");
  await page
    .getByRole("button", { name: "Validate mapping", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#status")).toContainText("Cancelled");
  await page.waitForTimeout(600);
  await expect(page.locator("#status")).toContainText("Cancelled");
  await expect(
    page.getByRole("button", { name: "Save mapping", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#report")).toBeDisabled();
  await uploadRig(page);
  await expectValid(page);
});

test("rest-transform errors and renderer limits are diagnosed without silently changing the source", async ({
  page,
}) => {
  await page.goto("/");
  for (const [defect, code] of [
    ["matrix_conflict", "rest_transform_conflict"],
    ["shear", "rest_matrix_shear"],
    ["bind_stride", "inverse_bind_layout"],
    ["empty_skin", "skin_joints_empty"],
    ["singular_mesh", "preview_mesh_transform"],
    ["extra_influences", "preview_influence_limit"],
  ]) {
    await uploadRig(page, { defect });
    await expect(page.locator("#status")).toContainText("Preview blocked");
    await expect(page.locator("#diagnostics")).toContainText(code);
    if (defect === "singular_mesh" || defect === "extra_influences") {
      await expect(page.locator("#bind-status")).toContainText(
        "Bind/weight checks passed",
      );
      await expect(page.locator("#mapping-status")).toContainText(
        "Mapping valid",
      );
    }
  }
  await uploadRig(page);
  await expectValid(page);
  await expect(page.locator("#status")).toHaveText(
    "Inspection complete. Preview ready.",
  );
});

test("misaligned skin accessors return layout errors before the preview loader", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.goto("/");
  for (const [defect, code] of [
    ["bind_offset", "inverse_bind_layout"],
    ["bind_absolute_offset", "inverse_bind_layout"],
    ["bind_compensated_offset", "inverse_bind_layout"],
    ["joints_offset", "joints_layout"],
    ["weights_offset", "weights_layout"],
  ]) {
    await uploadRig(page, { defect });
    await expect(page.locator("#status")).toContainText("Preview blocked");
    await expect(page.locator("#bind-status")).toContainText(
      "Bind/weight checks failed",
    );
    await expect(page.locator("#diagnostics")).toContainText(code);
  }
  await uploadRig(page);
  await expectValid(page);
  await expect(page.locator("#status")).toHaveText(
    "Inspection complete. Preview ready.",
  );
  expect(pageErrors).toEqual([]);
});
