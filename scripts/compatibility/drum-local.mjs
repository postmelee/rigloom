// Executes only against an isolated snapshot; never starts Vite in the source checkout.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { variants } from "./fixture.mjs";
const root = path.resolve(".local/compatibility");
const snapshot = path.join(root, "drum-vrm");
const manifest = JSON.parse(
  await readFile(path.join(root, "drum-source.json"), "utf8"),
);
assert.equal(manifest.commit, "d8dfab38cefc3bffd6edc0b88643d02ff829af73");
for (const entry of manifest.tree) {
  const bytes = await readFile(path.join(snapshot, entry.file));
  assert.equal(
    createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex"),
    entry.hash,
    entry.file,
  );
}
const server = await createServer({
  root: snapshot,
  configFile: path.join(snapshot, "vite.config.ts"),
  cacheDir: path.join(snapshot, "node_modules/.vite-rigloom"),
  server: { host: "127.0.0.1", port: 4186, strictPort: true },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ args: ["--use-angle=swiftshader"] });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [],
    network = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !r.url().startsWith("http://127.0.0.1:4186/")
    )
      network.push(r.url());
    if (["POST", "PUT", "PATCH"].includes(r.method()))
      network.push(r.method() + " " + r.url());
  });
  const results = [];
  for (const variant of variants) {
    await page.goto("http://127.0.0.1:4186/drum-vrm/");
    await page.locator("#start-demo").click();
    await page.locator("#play:not([disabled])").waitFor({ timeout: 60000 });
    await page
      .locator("#character-file")
      .setInputFiles(path.join(root, "output", `${variant}.vrm`));
    await page.waitForFunction(
      () =>
        document
          .querySelector("#character-message")
          .textContent.includes("불러오기 완료"),
      null,
      { timeout: 30000 },
    );
    await page.locator("#play").click();
    await page.waitForFunction(
      () => document.querySelector("#current-time").textContent !== "00:00",
    );
    await page.locator("#play").click();
    const bytes = await readFile(path.join(root, "output", `${variant}.vrm`));
    const result = await page.evaluate(async (data) => {
      const { loadLocalVRM } = await import("/drum-vrm/src/vrm-import.ts");
      const { VRMHumanoidRigAdapter } =
        await import("/drum-vrm/src/rig-vrm.ts");
      const { EngineClient } = await import("/drum-vrm/src/engine.ts");
      const { makeDemo } = await import("/drum-vrm/src/demo.ts");
      const candidate = await loadLocalVRM(
        new File([new Uint8Array(data)], "fixture.vrm"),
      );
      const Vector3 = candidate.vrm.scene.position.constructor;
      const adapter = new VRMHumanoidRigAdapter(
        candidate.vrm,
        "rigloom-compatibility",
      );
      const engine = new EngineClient();
      try {
        const midi = makeDemo(),
          info = await engine.inspect(midi);
        const original = await engine.plan(midi, {
          tracks: info.suggestedTracks,
          channel: 9,
        });
        const profile = adapter.setCalibration(
          adapter.getAutomaticCalibration(original.kit),
          original.kit,
        );
        const plan = engine.setSetup(profile, original.kit);
        function sample(t) {
          const pose = Array.from(engine.evaluate(t));
          adapter.applyPose(new Float32Array(pose));
          const vertices = [];
          candidate.vrm.scene.traverse((mesh) => {
            if (!mesh.isSkinnedMesh || mesh.name.endsWith("(erase)")) return;
            mesh.skeleton.update();
            const p = mesh.geometry.getAttribute("position");
            for (let i = 0; i < p.count; i++)
              vertices.push(
                ...mesh
                  .applyBoneTransform(
                    i,
                    new Vector3().fromBufferAttribute(p, i),
                  )
                  .applyMatrix4(mesh.matrixWorld)
                  .toArray(),
              );
          });
          return {
            time: t,
            pose,
            vertices,
            contacts: adapter.getContactSamples(),
          };
        }
        const times = [1, 0, 0.25, 0.5, 2, 5, 10, 20, 29, 1];
        const samples = times.map(sample);
        const diagnostics = {};
        for (const d of plan.diagnostics)
          diagnostics[d.code] = (diagnostics[d.code] ?? 0) + 1;
        return {
          info: candidate.info,
          hits: plan.hits.length,
          diagnostics,
          samples,
        };
      } finally {
        engine.dispose();
        adapter.dispose();
      }
    }, Array.from(bytes));
    assert.equal(result.info.required, 15);
    assert.deepEqual(result.info.missing, []);
    assert.ok(result.hits > 0);
    for (const sample of result.samples) {
      assert.equal(sample.pose.length, 73);
      assert.equal(sample.vertices.length, 360);
      assert.ok(
        [
          ...sample.pose,
          ...sample.vertices,
          ...sample.contacts.flatMap((c) => [
            c.errorMeters,
            ...c.actual,
            ...c.expected,
          ]),
        ].every(Number.isFinite),
      );
    }
    const first = result.samples[0],
      last = result.samples.at(-1);
    const repeatError = Math.max(
      ...first.vertices.map((v, i) => Math.abs(v - last.vertices[i])),
    );
    assert.ok(repeatError < 1e-7);
    assert.deepEqual(first.pose, last.pose);
    const movement = Math.max(
      ...result.samples[1].vertices.map((v, i) =>
        Math.abs(v - first.vertices[i]),
      ),
    );
    assert.ok(movement > 0.01);
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    await page.screenshot({
      path: path.join(root, "output", `${variant}-drum.png`),
    });
    const identity = JSON.parse(
      await readFile(path.join(root, "output", `${variant}.json`), "utf8"),
    );
    const summary = {
      variant,
      outputSha256: identity.outputSha256,
      requiredBones: result.info.required,
      missing: result.info.missing,
      fingers: result.info.fingers,
      hits: result.hits,
      diagnostics: result.diagnostics,
      sampleTimes: result.samples.map((s) => s.time),
      repeatError,
      movement,
      maxContactError: Math.max(
        ...result.samples.flatMap((s) => s.contacts.map((c) => c.errorMeters)),
      ),
      uiImportAndPlayback: true,
      errors: [],
      externalRequests: [],
    };
    results.push(summary);
    await writeFile(
      path.join(root, "output", `${variant}-drum.json`),
      JSON.stringify(result, null, 2),
    );
  }
  await writeFile(
    path.join(root, "drum-results.json"),
    JSON.stringify(
      {
        commit: "d8dfab38cefc3bffd6edc0b88643d02ff829af73",
        browser: browser.version(),
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
