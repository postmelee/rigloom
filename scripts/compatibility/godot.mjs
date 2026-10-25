// Requires the pinned external tools prepared as documented in docs/compatibility.md.
import assert from "node:assert/strict";
import { readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { variants } from "./fixture.mjs";
const root = path.resolve(".local/compatibility");
const executable =
  process.env.GODOT_BIN ??
  path.join(root, "godot/Godot.app/Contents/MacOS/Godot");
const project = path.join(root, "godot-project");
const addon = execFileSync(
  "git",
  ["-C", path.join(project, "addons/vrm"), "rev-parse", "HEAD"],
  { encoding: "utf8" },
).trim();
assert.equal(addon, "9c7436f100d62a8c0c84a1db3fa307be788ad792");
assert.equal(
  execFileSync(
    "git",
    ["-C", path.join(project, "addons/vrm"), "diff", "--exit-code"],
    { encoding: "utf8" },
  ),
  "",
);
assert.match(
  execFileSync(executable, ["--version"], { encoding: "utf8" }),
  /^4\.5\.1\.stable\.official\.f62fdbde1/,
);
await copyFile(
  "scripts/compatibility/godot-probe.gd",
  path.join(project, "probe.gd"),
);
for (const variant of variants)
  await copyFile(
    path.join(root, "output", `${variant}.vrm`),
    path.join(project, `${variant}.vrm`),
  );
async function run(args, log) {
  const process = spawnSync(executable, args, {
    encoding: "utf8",
    timeout: 120000,
  });
  const result = process.stdout + "\n" + process.stderr;
  await writeFile(path.join(root, log), result);
  assert.equal(process.status, 0, result);
  assert.doesNotMatch(result, /SCRIPT ERROR:|ERROR:/);
}
await run(
  ["--headless", "--path", project, "--editor", "--import", "--quit"],
  "godot-editor-import.log",
);
const summary = [];
function pointsError(actual, expected) {
  assert.equal(Object.keys(actual).length, 10);
  let max = 0;
  for (let mesh = 0; mesh < 10; mesh++) {
    const points = actual[`surface-${mesh}`];
    assert.equal(points.length, 12);
    const remaining = expected.slice(mesh * 12, mesh * 12 + 12);
    for (const point of points) {
      assert.ok(point.every(Number.isFinite));
      const distances = remaining.map((p) =>
        Math.hypot(...p.map((v, i) => v - point[i])),
      );
      const distance = Math.min(...distances);
      max = Math.max(max, distance);
      remaining.splice(distances.indexOf(distance), 1);
    }
  }
  assert.ok(max < 0.0001, `Godot world-space error ${max} exceeds 0.1 mm`);
  return max;
}
for (const variant of variants) {
  const prefix = path.join(root, "output", variant);
  await rm(`${prefix}-godot.json`, { force: true });
  await rm(`${prefix}-godot.png`, { force: true });
  await run(
    [
      "--path",
      project,
      "--resolution",
      "480x480",
      "--script",
      "probe.gd",
      "--",
      `res://${variant}.vrm`,
      `${prefix}-godot`,
    ],
    `${variant}-godot.log`,
  );
  assert.ok(
    (await readFile(`${prefix}-godot.png`)).length > 1000,
    "Missing rendered frame",
  );
  const actual = JSON.parse(await readFile(`${prefix}-godot.json`, "utf8"));
  const expected = JSON.parse(await readFile(`${prefix}.json`, "utf8"));
  assert.equal(
    actual.rendered,
    true,
    "A headless parse is not a viewer render",
  );
  assert.equal(actual.name, `Rigloom ${variant}`);
  assert.deepEqual(actual.authors, ["Rigloom original fixture"]);
  assert.equal(actual.license, "https://vrm.dev/licenses/1.0/");
  for (const bone of [
    "Hips",
    "Spine",
    "Head",
    ...["Left", "Right"].flatMap((s) =>
      ["UpperArm", "LowerArm", "Hand", "UpperLeg", "LowerLeg", "Foot"].map(
        (b) => s + b,
      ),
    ),
  ])
    assert.ok(actual.bones.includes(bone));
  assert.equal(Object.keys(actual.materials).length, 10);
  for (const [name, material] of Object.entries(actual.materials)) {
    const reference = expected.materials[Number(name.split("-")[1])];
    // Godot exposes StandardMaterial3D albedo in sRGB, Three.js in linear RGB.
    const linear = material.color.map((c) =>
      c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    assert.ok(
      Math.max(...linear.map((v, i) => Math.abs(v - reference.color[i]))) <
        1e-6,
    );
    assert.ok(Math.abs(material.metallic - reference.metalness) < 1e-6);
    assert.ok(Math.abs(material.roughness - reference.roughness) < 1e-6);
    assert.deepEqual(material.texture, reference.texture);
  }
  const errors = {
    neutral: pointsError(actual.neutral, expected.neutral),
    reset: pointsError(actual.reset, expected.neutral),
    elbow: pointsError(actual.poses.LeftLowerArm, expected.poses.leftLowerArm),
    knee: pointsError(actual.poses.RightLowerLeg, expected.poses.rightLowerLeg),
  };
  summary.push({
    variant,
    outputSha256: expected.outputSha256,
    engine: actual.engine,
    addon,
    errors,
    rendered: true,
  });
}
await writeFile(
  path.join(root, "godot-results.json"),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
