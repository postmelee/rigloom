// Opt-in actual-model verification; no third-party model bytes or automatic downloads in CI.
import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { digest } from "../scripts/quality/real-model.mjs";
for (const sample of ["seed", "twist"])
  test(`local ${sample}: actual-model WASM weights match native and survive bend/edit`, async ({
    page,
  }) => {
    test.skip(
      process.env.RIGLOOM_REAL_MODELS !== "1",
      "Requires reviewed local benchmark copies",
    );
    test.setTimeout(90000);
    const dir = `${process.env.RIGLOOM_QUALITY_ROOT ?? ".local/weight-quality-support-2026-10-26/v3"}/${sample}`;
    const source = await readFile(`${dir}/source.glb`),
      request = JSON.parse(await readFile(`${dir}/request.json`, "utf8"));
    await page.goto("/");
    await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
      name: "source.glb",
      mimeType: "model/gltf-binary",
      buffer: source,
    });
    await page.getByRole("button", { name: "Rig", exact: true }).click();
    await expect(page.locator("#rig-status")).toContainText("Place joints");
    await page.getByLabel("Load placement", { exact: true }).setInputFiles({
      name: "placement.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          ...request,
          schema_version: 1,
          source_sha256: digest(source),
        }),
      ),
    });
    await expect(page.locator("#rig-status")).toContainText(
      "Joint checks passed",
    );
    const start = Date.now();
    await page
      .getByRole("button", {
        name: /^(Preview deformation|Update preview)$/,
        exact: true,
      })
      .click();
    await expect(page.locator("#rig-status")).toContainText("Preview ·", {
      timeout: 60000,
    });
    const elapsed = Date.now() - start;
    const download = async (label: string) => {
      const pending = page.waitForEvent("download");
      await page.getByRole("button", { name: label, exact: true }).click();
      return readFile((await (await pending).path())!);
    };
    const generated = await download("Save rigged GLB");
    expect(generated).toEqual(await readFile(`${dir}/surface.glb`));
    const report = JSON.parse(
      (await download("Save weight report")).toString(),
    );
    expect(report.algorithm).toBe("surface-v3-experimental");
    expect(report.unweighted_vertices).toBe(0);
    expect(report.max_weight_sum_error).toBeLessThan(1e-6);
    await mkdir(`${dir}/browser`, { recursive: true });
    for (const bend of ["leftLowerArm", "leftLowerLeg"]) {
      await page.getByLabel("Bend", { exact: true }).selectOption(bend);
      await page.getByLabel("Angle", { exact: true }).press("Home");
      await page.getByLabel("Angle", { exact: true }).press("End");
      await expect(page.locator("#rig-angle-value")).toHaveText("120°");
      await page.screenshot({ path: `${dir}/browser/${bend}-120.png` });
      expect(await download("Save rigged GLB")).toEqual(generated);
    }
    await page
      .getByRole("button", { name: "Edit joints", exact: true })
      .click();
    await expect(page.locator("#rig-preview")).toBeHidden();
    await page
      .getByRole("button", {
        name: /^(Preview deformation|Update preview)$/,
        exact: true,
      })
      .click();
    await expect(page.locator("#rig-status")).toContainText("Preview ·", {
      timeout: 60000,
    });
    expect(await download("Save rigged GLB")).toEqual(generated);
    // Exercise an actual placement edit, not just a repeat of the same request.
    await page
      .getByRole("button", { name: "Edit joints", exact: true })
      .click();
    await page.getByLabel("Mirror left / right", { exact: true }).uncheck();
    await page.locator("#rig-joint").selectOption("10");
    const editedZ =
      request.joints[10][2] +
      Math.abs(request.joints[2][1] - request.joints[5][1]) * 0.02;
    await page.getByLabel("Joint Z", { exact: true }).fill(String(editedZ));
    await page.getByLabel("Joint Z", { exact: true }).press("Tab");
    const saved = JSON.parse((await download("Save placement")).toString());
    const editedRequest = {
      frame: saved.frame,
      joints: saved.joints,
      method: saved.method,
      rigid: saved.rigid,
    };
    await writeFile(
      `${dir}/edited-request.json`,
      JSON.stringify(editedRequest),
    );
    execFileSync(
      process.env.RIGLOOM_SKIN_BINARY ?? "target/release/examples/skin_quality",
      [
        `${dir}/source.glb`,
        `${dir}/edited-request.json`,
        `${dir}/edited-native.glb`,
      ],
    );
    await page
      .getByRole("button", { name: "Update preview", exact: true })
      .click();
    await expect(page.locator("#rig-preview")).toBeVisible({ timeout: 60000 });
    const edited = await download("Save rigged GLB");
    expect(edited).not.toEqual(generated);
    expect(edited).toEqual(await readFile(`${dir}/edited-native.glb`));
    await writeFile(
      `${dir}/browser/result.json`,
      JSON.stringify(
        {
          elapsed_ms: elapsed,
          browser: "Playwright Chromium",
          algorithm: report.algorithm,
          vertices: report.vertices,
          sha256: digest(generated),
          native_bytes_equal: true,
          edited_native_bytes_equal: true,
          edited_sha256: digest(edited),
        },
        null,
        2,
      ),
    );
  });

test("local Seed accessory: three UI groups reproduce the independently configured 609-part correction", async ({
  page,
}) => {
  test.skip(
    process.env.RIGLOOM_REAL_MODELS !== "1",
    "Requires reviewed local benchmark copies",
  );
  test.setTimeout(90000);
  const root =
    process.env.RIGLOOM_QUALITY_ROOT ??
    ".local/weight-quality-support-2026-10-26/v3";
  const source = await readFile(`${root}/seed/source.glb`);
  const request = JSON.parse(
    await readFile(`${root}/seed/request.json`, "utf8"),
  );
  const expected = JSON.parse(
    await readFile(`${root}/seed-rigid/request.json`, "utf8"),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
    name: "source.glb",
    mimeType: "model/gltf-binary",
    buffer: source,
  });
  await page.getByRole("button", { name: "Rig", exact: true }).click();
  await expect(page.locator("#rig-status")).toContainText("Place joints");
  await page.getByLabel("Load placement", { exact: true }).setInputFiles({
    name: "placement.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...request,
        schema_version: 1,
        source_sha256: digest(source),
      }),
    ),
  });
  await expect(page.locator("#rig-status")).toContainText(
    "Joint checks passed",
  );
  const out = `${root}/seed-rigid/browser`;
  await mkdir(out, { recursive: true });
  await page
    .getByRole("button", { name: "Preview deformation", exact: true })
    .click();
  await expect(page.locator("#rig-preview")).toBeVisible({ timeout: 60000 });
  await page.getByLabel("Angle", { exact: true }).press("End");
  await page.screenshot({ path: `${out}/automatic-elbow-120.png` });
  await page.getByRole("button", { name: "Edit joints", exact: true }).click();
  await page.getByText("Initial weights", { exact: true }).click();
  for (const node of [6, 7, 8]) {
    await page
      .getByLabel("Attachment target", { exact: true })
      .selectOption(`surface:${node}:0`);
    await page.getByLabel("Attachment", { exact: true }).selectOption("1");
  }
  const download = async (name: string) => {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    return readFile((await (await pending).path())!);
  };
  const placement = await download("Save placement");
  expect(JSON.parse(placement.toString()).rigid).toEqual(expected.rigid);
  expect(Object.keys(expected.rigid)).toHaveLength(609);
  await page
    .getByLabel("Attachment target", { exact: true })
    .selectOption("surface:6:0");
  await page.getByLabel("Attachment", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/selection.png` });
  await page
    .getByRole("button", { name: "Update preview", exact: true })
    .click();
  await expect(page.locator("#rig-preview")).toBeVisible({ timeout: 60000 });
  const generated = await download("Save rigged GLB");
  expect(generated).toEqual(await readFile(`${root}/seed-rigid/surface.glb`));
  const report = JSON.parse((await download("Save weight report")).toString());
  expect(report.rigid).toEqual(expected.rigid);
  expect(report.max_weight_sum_error).toBeLessThan(1e-6);
  expect(report.unweighted_vertices).toBe(0);
  for (const bend of ["leftLowerArm", "leftLowerLeg"]) {
    await page.getByLabel("Bend", { exact: true }).selectOption(bend);
    await page.getByLabel("Angle", { exact: true }).press("End");
    await expect(page.locator("#rig-angle-value")).toHaveText("120°");
    await page.screenshot({ path: `${out}/${bend}-120.png` });
    expect(await download("Save rigged GLB")).toEqual(generated);
  }
  await page.getByRole("button", { name: "Edit joints", exact: true }).click();
  await page.getByLabel("Load placement", { exact: true }).setInputFiles({
    name: "placement.json",
    mimeType: "application/json",
    buffer: placement,
  });
  await expect(page.locator("#rig-status")).toContainText(
    "Joint checks passed",
  );
  await page
    .getByRole("button", { name: "Update preview", exact: true })
    .click();
  await expect(page.locator("#rig-preview")).toBeVisible({ timeout: 60000 });
  expect(await download("Save rigged GLB")).toEqual(generated);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        source_sha256: digest(source),
        output_sha256: digest(generated),
        surface_group_assignments: 3,
        explicit_component_overrides: 609,
        native_bytes_equal: true,
        placement_round_trip: true,
        preview_rest_bytes_unchanged: true,
      },
      null,
      2,
    ),
  );
});
