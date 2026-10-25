import { test, expect, type Page } from "@playwright/test";
import { unriggedFixture } from "../scripts/unrigged-fixture.mjs";
import { rigFixture, boneNodes } from "../scripts/rig-fixture.mjs";
import { readGlb, writeGlb } from "../scripts/export-fixture.mjs";
async function upload(page: Page, buffer: Buffer) {
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "workflow.glb",
    mimeType: "model/gltf-binary",
    buffer,
  });
  await expect(page.locator("#next-step")).not.toHaveText(
    "Checking the model…",
  );
}
test("unskinned route avoids empty mapping and previews, edits and updates without manual validation", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, unriggedFixture());
  await expect(page.locator("#next-step")).toContainText("No skin found");
  await page.getByRole("button", { name: "Mapping", exact: true }).click();
  await expect(page.locator("#mapping-fields")).toBeHidden();
  await page
    .getByRole("button", { name: "Place joints in Rig", exact: true })
    .press("Enter");
  await expect(page.locator("#rig-status")).toContainText("Place joints");
  await expect(
    page.getByRole("button", { name: "Check joint placement", exact: true }),
  ).toBeHidden();
  await page
    .getByRole("button", { name: "Preview deformation", exact: true })
    .click();
  await expect(page.locator("#rig-preview")).toBeVisible();
  await page.getByRole("button", { name: "Edit joints", exact: true }).click();
  await expect(page.locator("#rig-status")).toContainText(
    "Previous output is unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Save rigged GLB", exact: true }),
  ).toBeHidden();
  await page.getByLabel("Joint Y", { exact: true }).fill("0.9");
  await page.getByLabel("Joint Y", { exact: true }).press("Tab");
  await expect(page.locator("#rig-status")).toContainText("Placement changed");
  await page
    .getByRole("button", { name: "Update preview", exact: true })
    .click();
  await expect(page.locator("#rig-preview")).toBeVisible();
  // Replacement starts a fresh workflow, never an update of the previous file.
  await upload(page, unriggedFixture("asymmetric"));
  await page.getByRole("button", { name: "Place joints", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Preview deformation", exact: true }),
  ).toBeVisible();
});
test("existing rigs guide mapping and block stale export advice after assignment edits", async ({
  page,
}) => {
  await page.goto("/");
  const { json, bin } = readGlb(rigFixture());
  json.nodes[boneNodes.hips].name = "Unknown root";
  await upload(page, writeGlb(json, bin));
  await expect(page.locator("#next-action")).toHaveText("Review bone mapping");
  await page.locator("#next-action").click();
  await expect(page.locator("#mapping-help")).toBeVisible();
  await page
    .getByLabel("Bone hips", { exact: true })
    .selectOption(String(boneNodes.hips));
  await page
    .getByRole("button", { name: "Check assignments", exact: true })
    .click();
  await expect(page.locator("#mapping-status")).toContainText(
    "assignments checked",
  );
  await page.getByRole("button", { name: "Model", exact: true }).click();
  await expect(page.locator("#next-action")).toHaveText("Prepare export");
  await page.getByRole("button", { name: "Rig", exact: true }).click();
  await expect(page.locator("#rig-status")).toContainText("already has a rig");
  await expect(page.locator("#rig-controls")).toBeHidden();
  await page
    .getByRole("button", { name: "Review bone mapping", exact: true })
    .click();
  await page.getByLabel("Bone hips", { exact: true }).selectOption("");
  await page.getByRole("button", { name: "Model", exact: true }).click();
  await expect(page.locator("#next-step")).toContainText("assignments changed");
  await expect(page.locator("#next-action")).toBeHidden();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.locator("#export-vrm")).toBeDisabled();
});
test("blocked input explains repair with expandable technical details and recovers on replacement", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, Buffer.from("not a GLB"));
  await expect(page.locator("#next-step")).toContainText(
    "file needs attention",
  );
  await expect(page.locator("#next-action")).toBeHidden();
  await expect(page.locator("#diagnostics")).toContainText(
    "could not be read as a GLB",
  );
  await expect(page.locator("#diagnostics code").first()).toBeHidden();
  await page.locator("#diagnostics summary").first().click();
  await expect(page.locator("#diagnostics code").first()).toBeVisible();
  await page.getByRole("button", { name: "Rig", exact: true }).click();
  await expect(page.locator("#rig-status")).toContainText(
    "Resolve the file issues",
  );
  await upload(page, unriggedFixture());
  await expect(page.locator("#next-action")).toHaveText("Place joints");
});
