import { test, expect, type Page } from "@playwright/test";
import { unriggedFixture } from "../scripts/unrigged-fixture.mjs";
async function open(page: Page) {
  await page.goto("/");
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "unrigged.glb",
    mimeType: "model/gltf-binary",
    buffer: unriggedFixture(),
  });
  await page.getByRole("button", { name: "Rig", exact: true }).click();
  await expect(page.locator("#rig-status")).toContainText("Place joints");
  await page.locator("#rig-joint").selectOption("10");
  await page.locator("canvas").focus();
}
const coordinate = async (page: Page, axis: string) =>
  Number(await page.getByLabel(`Joint ${axis}`, { exact: true }).inputValue());
test("axis nudges mirror, respect step size and share Cmd/Ctrl undo and redo", async ({
  page,
}) => {
  await open(page);
  const x = await coordinate(page, "X"),
    y = await coordinate(page, "Y");
  await page.keyboard.press("ArrowRight");
  expect(await coordinate(page, "X")).toBeCloseTo(x + 0.01, 6);
  await page.keyboard.press("Shift+ArrowUp");
  expect(await coordinate(page, "Y")).toBeCloseTo(y + 0.001, 6);
  await page.keyboard.press("Alt+ArrowUp");
  expect(await coordinate(page, "Z")).toBeCloseTo(0.01, 6);
  await page.keyboard.press("Meta+z");
  expect(await coordinate(page, "Z")).toBe(0);
  await page.keyboard.press("Meta+Shift+z");
  expect(await coordinate(page, "Z")).toBeCloseTo(0.01, 6);
  await page.keyboard.press("Control+z");
  expect(await coordinate(page, "Z")).toBe(0);
  await page.keyboard.press("Control+y");
  expect(await coordinate(page, "Z")).toBeCloseTo(0.01, 6);
  await page.locator("#rig-joint").selectOption("13");
  expect(await coordinate(page, "X")).toBeCloseTo(-x - 0.01, 6);
  expect(await coordinate(page, "Z")).toBeCloseTo(0.01, 6);
  await page.getByText("Keyboard shortcuts", { exact: true }).click();
  await page.getByLabel("Move step", { exact: true }).selectOption("0.1");
  await page.getByRole("button", { name: "Focus model", exact: true }).click();
  await expect(page.locator("canvas")).toBeFocused();
  await page.keyboard.press("Alt+ArrowDown");
  expect(await coordinate(page, "Z")).toBeCloseTo(-0.09, 6);
  await page.keyboard.press("2");
  await expect(
    page.getByRole("button", { name: "Side", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("1");
  await expect(
    page.getByRole("button", { name: "Front", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("]");
  await expect(page.locator("#rig-joint")).toHaveValue("14");
  await page.keyboard.press("[");
  await expect(page.locator("#rig-joint")).toHaveValue("13");
});
test("held nudges undo as one gesture and input/IME/hidden-panel events are untouched", async ({
  page,
}) => {
  await open(page);
  const x = await coordinate(page, "X");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.up("ArrowRight");
  expect(await coordinate(page, "X")).toBeCloseTo(x + 0.03, 6);
  await page.keyboard.press("Meta+z");
  expect(await coordinate(page, "X")).toBeCloseTo(x, 6);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Control+Shift+z");
  expect(await coordinate(page, "X")).toBeCloseTo(x + 0.03, 6);
  await page.getByLabel("Joint X", { exact: true }).focus();
  // Real key event is observed after the application handler: native text undo is not cancelled.
  await page.evaluate(() => {
    document.addEventListener("keydown", (event) => {
      document.documentElement.dataset.keyPrevented = String(
        event.defaultPrevented,
      );
    });
  });
  await page.keyboard.press("Meta+z");
  await expect(page.locator("html")).toHaveAttribute(
    "data-key-prevented",
    "false",
  );
  await page.locator("canvas").focus();
  await page.locator("canvas").dispatchEvent("keydown", {
    key: "ArrowUp",
    code: "ArrowUp",
    isComposing: true,
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-key-prevented",
    "false",
  );
  await page.getByRole("button", { name: "Rig", exact: true }).click();
  await page.locator("canvas").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Meta+z");
  expect(await coordinate(page, "X")).toBeCloseTo(x + 0.03, 6);
  await expect(page.locator("html")).toHaveAttribute(
    "data-key-prevented",
    "false",
  );
});
test("worker work and generated preview block placement shortcuts", async ({
  page,
}) => {
  await open(page);
  const x = await coordinate(page, "X");
  await page.route("**/*rig.worker*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  const pending = page.waitForRequest(/rig\.worker/);
  await page
    .getByRole("button", { name: "Generate weights", exact: true })
    .click();
  await pending;
  await page.locator("canvas").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Meta+z");
  expect(await coordinate(page, "X")).toBe(x);
  await expect(page.locator("#rig-status")).toContainText("Preview ·");
  await page.locator("canvas").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Meta+z");
  await expect(page.locator("#rig-preview")).toBeVisible();
  expect(await coordinate(page, "X")).toBe(x);
  await page.getByRole("button", { name: "Edit joints", exact: true }).click();
  await expect(page.getByLabel("Joint X", { exact: true })).toBeEnabled();
  await page.locator("canvas").focus();
  await page.keyboard.press("ArrowRight");
  expect(await coordinate(page, "X")).toBeCloseTo(x + 0.01, 6);
});
