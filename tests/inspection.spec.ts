import { test, expect } from "@playwright/test";
import { fixture } from "../scripts/fixtures.mjs";
const upload = (page, options = {}) =>
  page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "synthetic.glb",
    mimeType: "model/gltf-binary",
    buffer: fixture(options),
  });
test("Rust WASM previews multi-mesh geometry and downloads the report without uploads", async ({
  page,
}) => {
  const external: string[] = [],
    mutations: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith("http://127.0.0.1:4173/"))
      external.push(url);
    if (["POST", "PUT", "PATCH"].includes(request.method()))
      mutations.push(url);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await upload(page, { multi: true });
  await expect(page.getByRole("status")).toHaveText(
    "Inspection complete. Preview ready.",
  );
  await expect(page.locator("#stats")).toContainText("Vertices6");
  await expect(page.locator("#nodes li")).toHaveCount(2);
  for (const name of ["Front", "Side", "Free"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save report" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("rigloom-inspection.json");
  await page.screenshot({
    path: "test-results/inspection.png",
    fullPage: true,
  });
  expect(external).toEqual([]);
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});
test("existing skin is inventoried and rendered", async ({ page }) => {
  await page.goto("/");
  await upload(page, { rigged: true });
  await expect(page.getByRole("status")).toHaveText(
    "Inspection complete. Preview ready.",
  );
  await expect(page.locator("#stats")).toContainText("Skins1");
});
test("external resources are blocked before loader network access", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("example.invalid")) requests.push(r.url());
  });
  await page.goto("/");
  await upload(page, { external: true });
  await expect(page.getByRole("status")).toContainText("Preview blocked");
  await expect(page.locator("#diagnostics")).toContainText("resource_uri");
  expect(requests).toEqual([]);
});
test("unsupported extensions and malformed files return actionable diagnostics", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page, { extension: true });
  await expect(page.getByRole("status")).toContainText("Preview blocked");
  await expect(page.locator("#diagnostics")).toContainText(
    "unsupported_extension",
  );
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "bad.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from("broken"),
  });
  await expect(page.locator("#diagnostics")).toContainText("invalid_glb");
});
test("cancel and replacement ignore stale results", async ({ page }) => {
  await page.goto("/");
  await page.route(
    "**/*inspect.worker*",
    (route) =>
      new Promise((resolve) =>
        setTimeout(() => resolve(route.continue()), 400),
      ),
  );
  await upload(page);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("status")).toContainText("Cancelled");
  await page.waitForTimeout(600);
  await expect(page.getByRole("status")).toContainText("Cancelled");
  await upload(page, { rigged: true });
  await expect(page.getByRole("status")).toHaveText(
    "Inspection complete. Preview ready.",
  );
  await expect(page.locator("#stats")).toContainText("Skins1");
});

test("invalid accessor layouts return diagnostics and a subsequent valid file still previews", async ({
  page,
}) => {
  await page.goto("/");
  for (const [invalidAccessor, code] of [
    ["zero_count", "accessor_count"],
    ["position_shape", "position_layout"],
    ["float_indices", "index_layout"],
    ["position_reference", "invalid_gltf"],
  ]) {
    await upload(page, { invalidAccessor });
    await expect(page.getByRole("status")).toContainText("Preview blocked");
    await expect(page.locator("#diagnostics")).toContainText(code);
    await expect(
      page.getByRole("button", { name: "Save report" }),
    ).toBeEnabled();
  }
  await upload(page, { rigged: true });
  await expect(page.getByRole("status")).toHaveText(
    "Inspection complete. Preview ready.",
  );
});
