import { test, expect } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "vite";
import {
  humanoidFixture,
  variants,
  posedOracle,
} from "../scripts/compatibility/fixture.mjs";
import { validateVrmSchemas } from "../scripts/vrm-validation.mjs";
import { readGlb } from "../scripts/export-fixture.mjs";

const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const permissions = {
  "Avatar permission": "onlyAuthor",
  "Commercial usage": "personalNonProfit",
  "Credit notation": "required",
  Modification: "allowModification",
  "Violent usage": "false",
  "Sexual usage": "false",
  "Political or religious usage": "false",
  "Antisocial or hate usage": "false",
  Redistribution: "false",
};
function error(a: number[][], b: number[][]) {
  expect(a.length).toBe(b.length);
  return Math.max(
    ...a.flatMap((p, i) => p.map((v, j) => Math.abs(v - b[i][j]))),
  );
}
let bundle: string;
test.beforeAll(async () => {
  const result: any = await build({
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      lib: {
        entry: "scripts/compatibility/three-probe.mjs",
        name: "Compatibility",
        formats: ["iife"],
      },
    },
  });
  bundle = result[0].output.find((item: any) => item.type === "chunk").code;
});
for (const variant of variants)
  test(`compatibility: ${variant} preserves neutral and posed surfaces with deterministic exports`, async ({
    page,
    context,
  }) => {
    test.setTimeout(90000);
    const errors: string[] = [],
      requests: string[] = [];
    context.on("page", (p) => p.on("pageerror", (e) => errors.push(String(e))));
    page.on("pageerror", (e) => errors.push(String(e)));
    context.on("request", (r) => {
      if (
        /^https?:/.test(r.url()) &&
        !r.url().startsWith("http://127.0.0.1:4173/")
      )
        requests.push(r.url());
    });
    const fixture = humanoidFixture(variant);
    await page.goto("/");
    await page.getByLabel("Open GLB", { exact: true }).setInputFiles({
      name: `${variant}.glb`,
      mimeType: "model/gltf-binary",
      buffer: fixture.bytes,
    });
    await expect(page.locator("#mapping-status")).toContainText(
      "Body-part assignments checked",
    );
    await expect(page.locator("#bind-status")).toContainText(
      "Bind/weight checks passed",
    );
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page
      .getByLabel("Avatar name", { exact: true })
      .fill(`Rigloom ${variant}`);
    await page
      .getByLabel("Authors (one per line)", { exact: true })
      .fill("Rigloom original fixture");
    for (const [label, value] of Object.entries(permissions))
      await page.getByLabel(label, { exact: true }).selectOption(value);
    await page
      .getByLabel("I can set these usage permissions", { exact: true })
      .check();
    await page
      .getByLabel("Source is a T-pose humanoid facing +Z, Y-up, in meters", {
        exact: true,
      })
      .check();
    async function download() {
      await page
        .getByRole("button", { name: "Export VRM 1.0", exact: true })
        .click();
      await expect(page.locator("#export-status")).toContainText("VRM ready");
      const pending = page.waitForEvent("download");
      await page.getByRole("button", { name: "Save VRM", exact: true }).click();
      return readFile((await (await pending).path())!);
    }
    const output = await download();
    expect(await download()).toEqual(output);
    const decoded = await validateVrmSchemas(output);
    expect(decoded.bin).toEqual(readGlb(fixture.bytes).bin);
    const probePage = await context.newPage();
    await probePage.goto("about:blank");
    await probePage.addScriptTag({ content: bundle });
    const source: any = await probePage.evaluate(
      (data) => (window as any).Compatibility.probe(data, false),
      Array.from(fixture.bytes),
    );
    const loaded: any = await probePage.evaluate(
      (data) => (window as any).Compatibility.probe(data, true),
      Array.from(output),
    );
    expect(loaded.meshes).toBe(10);
    expect(loaded.materials).toEqual(source.materials);
    const neutralError = error(
      loaded.neutral,
      fixture.oracle.map((v: any) => v.p),
    );
    expect(neutralError).toBeLessThan(1e-6);
    expect(error(loaded.neutral, source.neutral)).toBeLessThan(1e-7);
    expect(error(loaded.reset, loaded.neutral)).toBeLessThan(1e-7);
    const poseErrors: Record<string, number> = {};
    for (const [bone, axis, angle] of [
      ["leftLowerArm", "z", Math.PI / 3],
      ["rightLowerLeg", "x", Math.PI / 4],
    ] as const) {
      poseErrors[bone] = error(
        loaded.poses[bone],
        posedOracle(fixture, bone, axis, angle),
      );
      expect(poseErrors[bone]).toBeLessThan(1e-6);
      expect(error(loaded.poses[bone], source.poses[bone])).toBeLessThan(1e-7);
      expect(error(loaded.poses[bone], loaded.neutral)).toBeGreaterThan(0.01);
    }
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
    const dir = ".local/compatibility/output";
    await mkdir(dir, { recursive: true });
    await writeFile(`${dir}/${variant}.glb`, fixture.bytes);
    await writeFile(`${dir}/${variant}.vrm`, output);
    await writeFile(
      `${dir}/${variant}-three.png`,
      Buffer.from(loaded.png.split(",")[1], "base64"),
    );
    await writeFile(
      `${dir}/${variant}.json`,
      JSON.stringify(
        {
          variant,
          sourceSha256: hash(fixture.bytes),
          outputSha256: hash(output),
          sourceBytes: fixture.bytes.length,
          outputBytes: output.length,
          vertices: loaded.neutral.length,
          neutralError,
          poseErrors,
          neutral: loaded.neutral,
          poses: loaded.poses,
          materials: loaded.materials,
        },
        null,
        2,
      ),
    );
    await probePage.close();
  });
