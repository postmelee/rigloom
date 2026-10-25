// Independent CPU deformation comparison against authored-weight reference, local files only.
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { Vector3 } from "three";
import { accessor, bones, parents, encodeSurface } from "./real-model.mjs";
import { readGlb } from "../export-fixture.mjs";
const dir = process.argv[2];
const methods = process.argv.slice(3);
if (!methods.length) methods.push("segment", "surface");
const reference = JSON.parse(await readFile(`${dir}/reference.json`, "utf8"));
const request = JSON.parse(await readFile(`${dir}/request.json`, "utf8"));
const descendant = (bone, ancestor) => {
  for (let i = bone; i !== null; i = parents[i])
    if (i === ancestor) return true;
  return false;
};
const pose = (point, weights, joint, angle) => {
  const weight = weights.reduce(
    (s, w, i) => s + (descendant(i, joint) ? w : 0),
    0,
  );
  const origin = new Vector3(...reference.joints[joint]);
  const p = new Vector3(...point);
  const axis = new Vector3(...(joint >= 9 ? [0, 0, 1] : [1, 0, 0]));
  return p
    .clone()
    .lerp(p.clone().sub(origin).applyAxisAngle(axis, angle).add(origin), weight)
    .toArray();
};
const results = [];
for (const method of methods) {
  request.method = method;
  await writeFile(`${dir}/run-request.json`, JSON.stringify(request));
  const report = JSON.parse(
    execFileSync(
      process.env.RIGLOOM_SKIN_BINARY ?? "target/release/examples/skin_quality",
      [`${dir}/source.glb`, `${dir}/run-request.json`, `${dir}/${method}.glb`],
      { maxBuffer: 20 * 1024 * 1024 },
    ).toString(),
  );
  await writeFile(
    `${dir}/${method}-report.json`,
    JSON.stringify(report, null, 2),
  );
  const { json, bin } = readGlb(await readFile(`${dir}/${method}.glb`));
  const weights = reference.parts.map((part, i) => {
    const p = json.meshes[json.nodes[i].mesh].primitives[0];
    const ids = accessor(json, bin, p.attributes.JOINTS_0),
      ws = accessor(json, bin, p.attributes.WEIGHTS_0);
    return ws.map((w, v) => {
      const out = Array(15).fill(0);
      w.forEach((n, k) => (out[ids[v][k]] += n));
      return out;
    });
  });
  const poses = [];
  for (const joint of [9, 10, 12, 13, 3, 4, 6, 7])
    for (const degrees of [30, 60, 90, 120]) {
      const angle =
        ((degrees * Math.PI) / 180) * (joint === 9 || joint === 10 ? -1 : 1);
      const errors = [],
        active = [],
        remote = [];
      let stretch = 0,
        edgeCount = 0;
      const generatedParts = [],
        referenceParts = [];
      reference.parts.forEach((part, pi) => {
        const expected = part.points.map((p, i) =>
          pose(p, part.weights[i], joint, angle),
        );
        const actual = part.points.map((p, i) =>
          pose(p, weights[pi][i], joint, angle),
        );
        actual.forEach((p, i) => {
          const d = new Vector3(...p).distanceTo(new Vector3(...expected[i]));
          errors.push(d);
          const w = part.weights[i].reduce(
            (s, v, b) => s + (descendant(b, joint) ? v : 0),
            0,
          );
          if (w > 0.01) active.push(d);
          else if (w < 0.001)
            remote.push(
              new Vector3(...p).distanceTo(new Vector3(...part.points[i])),
            );
        });
        for (let i = 0; i < part.indices.length; i += 3)
          for (const [a, b] of [
            [part.indices[i], part.indices[i + 1]],
            [part.indices[i + 1], part.indices[i + 2]],
            [part.indices[i + 2], part.indices[i]],
          ]) {
            const rest = new Vector3(...part.points[a]).distanceTo(
              new Vector3(...part.points[b]),
            );
            if (rest < 1e-6) continue;
            const x = new Vector3(...actual[a]).distanceTo(
              new Vector3(...actual[b]),
            );
            const e = new Vector3(...expected[a]).distanceTo(
              new Vector3(...expected[b]),
            );
            stretch += Math.abs(x - e) / rest;
            edgeCount++;
          }
        generatedParts.push({ ...part, points: actual });
        referenceParts.push({ ...part, points: expected });
      });
      const rms = (a) =>
        Math.sqrt(a.reduce((s, x) => s + x * x, 0) / Math.max(a.length, 1));
      errors.sort((a, b) => a - b);
      poses.push({
        joint: bones[joint],
        degrees,
        rms_m: rms(errors),
        active_rms_m: rms(active),
        p95_m: errors[Math.floor(errors.length * 0.95)],
        max_m: errors.at(-1),
        remote_over_1cm: remote.filter((x) => x > 0.01).length,
        mean_relative_edge_error: stretch / edgeCount,
      });
      if (degrees === 90) {
        await writeFile(
          `${dir}/${method}-${bones[joint]}.glb`,
          encodeSurface(generatedParts),
        );
        await writeFile(
          `${dir}/reference-${bones[joint]}.glb`,
          encodeSurface(referenceParts),
        );
      }
    }
  results.push({
    method,
    elapsed_ms: report.elapsed_ms,
    vertices: report.vertices,
    components: report.components.length,
    mean_pose_rms_m: poses.reduce((s, p) => s + p.rms_m, 0) / poses.length,
    poses,
  });
}
await writeFile(
  `${dir}/comparison-${methods.join("-")}.json`,
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify(
    results.map(({ poses, ...r }) => ({
      ...r,
      elbow90: poses.find(
        (p) => p.joint === "leftLowerArm" && p.degrees === 90,
      ),
      knee90: poses.find((p) => p.joint === "leftLowerLeg" && p.degrees === 90),
    })),
    null,
    2,
  ),
);
