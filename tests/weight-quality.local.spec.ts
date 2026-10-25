// Opt-in actual-model verification; no third-party model bytes or automatic downloads in CI.
import { test, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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
    const dir = `.local/weight-quality/${sample}`;
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
      .getByRole("button", { name: "Generate weights", exact: true })
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
    expect(report.algorithm).toBe("surface-v2-experimental");
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
      .getByRole("button", { name: "Generate weights", exact: true })
      .click();
    await expect(page.locator("#rig-status")).toContainText("Preview ·", {
      timeout: 60000,
    });
    expect(await download("Save rigged GLB")).toEqual(generated);
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
        },
        null,
        2,
      ),
    );
  });
