import { test, expect } from "@playwright/test";
import { rigFixture } from "../scripts/rig-fixture.mjs";

test("themes persist and contextual panels close with keyboard focus restored", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#inspector")).toBeHidden();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Mapping", exact: true }).click();
  await expect(page.locator("#panel-mapping")).toBeVisible();
  await expect(page.locator("#panel-model")).toBeHidden();
  await expect(page.locator("#panel-export")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#inspector")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Mapping", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("narrow screens keep the preview and selected controls in the document without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "humanoid-with-a-long-source-filename.glb",
    mimeType: "model/gltf-binary",
    buffer: rigFixture(),
  });
  await expect(page.locator("#status")).toContainText("Preview ready");
  await page.getByRole("button", { name: "Mapping", exact: true }).click();
  await expect(page.getByLabel("Bone hips", { exact: true })).toBeVisible();
  await page.getByLabel("Bone hips", { exact: true }).selectOption("");
  await page
    .getByRole("button", { name: "Validate mapping", exact: true })
    .click();
  await expect(page.locator("#diagnostics")).toContainText("mapping_required");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.locator("#panel-mapping")).toBeHidden();
  await expect(page.locator("#export-vrm")).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
