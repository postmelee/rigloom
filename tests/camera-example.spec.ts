import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unriggedFixture } from "../scripts/unrigged-fixture.mjs";
async function openExample(page: Page) {
  await page.goto("/");
  // Reach the entry button by keyboard, without choosing a filesystem path.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Open example", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#rig-status")).toContainText("Place joints");
  await expect(page.locator("#panel-rig")).toBeVisible();
  await expect(page.locator("canvas")).toBeFocused();
}
async function placement(page: Page) {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save placement", exact: true })
    .click();
  return readFile((await (await pending).path())!);
}
async function rendered(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  return page.locator("canvas").screenshot();
}
test("keyboard-only example entry loads the original fixture and camera commands preserve placement", async ({
  page,
}) => {
  const response = page.waitForResponse(/examples\/unrigged-standard.glb/);
  await openExample(page);
  expect(await (await response).body()).toEqual(unriggedFixture());
  const original = await placement(page);
  await page.locator("canvas").focus();
  const initial = await rendered(page);
  await page.keyboard.press("=");
  expect(await rendered(page)).not.toEqual(initial);
  await page.keyboard.press("f");
  expect(await rendered(page)).toEqual(initial);
  await page.keyboard.press("-");
  expect(await rendered(page)).not.toEqual(initial);
  await page.keyboard.press("f");
  await page.keyboard.press("j");
  expect(await rendered(page)).not.toEqual(initial);
  await expect(
    page.getByRole("button", { name: "Free", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("1");
  expect(await rendered(page)).toEqual(initial);
  await page.keyboard.press("Shift+l");
  expect(await rendered(page)).not.toEqual(initial);
  await page.keyboard.press("f");
  expect(await rendered(page)).toEqual(initial);
  expect(await placement(page)).toEqual(original);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", {
      name: /^(Preview deformation|Update preview)$/,
      exact: true,
    })
    .click();
  await expect(page.locator("#rig-status")).toContainText("Preview ·");
  await page.locator("canvas").focus();
  const preview = await rendered(page);
  await page.keyboard.press("i");
  expect(await rendered(page)).not.toEqual(preview);
  await expect(page.locator("#rig-preview")).toBeVisible();
});
test("example fetch failure, cancellation and replacement do not restore a stale model", async ({
  page,
}) => {
  await page.goto("/");
  await page.route("**/examples/unrigged-standard.glb", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.getByRole("button", { name: "Open example", exact: true }).click();
  await expect(page.locator("#status")).toContainText("Could not read example");
  await expect(page.locator("#rig-generate")).toBeDisabled();
  await page.unroute("**/examples/unrigged-standard.glb");
  await page.route("**/examples/unrigged-standard.glb", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({
      status: 200,
      contentType: "model/gltf-binary",
      body: unriggedFixture(),
    });
  });
  let pending = page.waitForRequest(/examples\/unrigged-standard.glb/);
  await page.getByRole("button", { name: "Open example", exact: true }).click();
  await pending;
  await page.locator("#cancel").click();
  await page.waitForTimeout(750);
  await expect(page.locator("#status")).toContainText("Cancelled");
  await expect(page.locator("#empty")).toBeVisible();
  pending = page.waitForRequest(/examples\/unrigged-standard.glb/);
  await page.getByRole("button", { name: "Open example", exact: true }).click();
  await pending;
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "my-model.glb",
    mimeType: "model/gltf-binary",
    buffer: unriggedFixture("asymmetric"),
  });
  await expect(page.locator("#status")).toContainText("Preview ready");
  await page.waitForTimeout(750);
  await expect(page.locator("#filename")).toHaveText("my-model.glb");
  await expect(page.locator("#panel-model")).toBeVisible();
});
test("camera shortcuts preserve input/browser combinations and fit after repeated orbit", async ({
  page,
}) => {
  await openExample(page);
  await page.evaluate(() =>
    document.addEventListener("keydown", (event) => {
      document.documentElement.dataset.keyPrevented = String(
        event.defaultPrevented,
      );
    }),
  );
  await page.getByLabel("Joint X", { exact: true }).press("f");
  await expect(page.locator("html")).toHaveAttribute(
    "data-key-prevented",
    "false",
  );
  await page.locator("canvas").focus();
  // Browser combinations are not consumed; dispatch avoids changing browser zoom in the test.
  await page
    .locator("canvas")
    .dispatchEvent("keydown", { key: "+", code: "Equal", ctrlKey: true });
  await expect(page.locator("html")).toHaveAttribute(
    "data-key-prevented",
    "false",
  );
  await page
    .locator("canvas")
    .dispatchEvent("keydown", { key: "i", code: "KeyI", isComposing: true });
  await expect(page.locator("html")).toHaveAttribute(
    "data-key-prevented",
    "false",
  );
  await page.keyboard.press("1");
  const initial = await rendered(page);
  for (let i = 0; i < 30; i++) await page.keyboard.press("i");
  await page.keyboard.press("1");
  expect(await rendered(page)).toEqual(initial);
});
