// Downloads tools into ignored storage and snapshots only the requested Git commit.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, cp, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
const pins = JSON.parse(
  await readFile(new URL("./tools.json", import.meta.url), "utf8"),
);
const root = path.resolve(".local/compatibility");
await mkdir(root, { recursive: true });
const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};
if (process.argv[2] === "godot") {
  assert.equal(
    process.platform,
    "darwin",
    "This pinned binary setup is for macOS only.",
  );
  const zip = path.join(root, "godot.zip");
  if (!(await exists(zip))) {
    const response = await fetch(pins.godot.url);
    assert.ok(response.ok);
    await writeFile(zip, Buffer.from(await response.arrayBuffer()));
  }
  assert.equal(
    createHash("sha256")
      .update(await readFile(zip))
      .digest("hex"),
    pins.godot.sha256,
  );
  if (!(await exists(path.join(root, "godot/Godot.app"))))
    execFileSync("unzip", ["-q", zip, "-d", path.join(root, "godot")]);
  const addon = path.join(root, "godot-vrm");
  if (!(await exists(addon))) {
    execFileSync("git", ["init", addon]);
    execFileSync("git", [
      "-C",
      addon,
      "fetch",
      "--depth",
      "1",
      pins.godotVrm.repository,
      pins.godotVrm.revision,
    ]);
    execFileSync("git", ["-C", addon, "checkout", "--detach", "FETCH_HEAD"]);
  }
  assert.equal(
    execFileSync("git", ["-C", addon, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    pins.godotVrm.revision,
  );
  assert.equal(
    execFileSync("git", ["-C", addon, "diff", "--exit-code"], {
      encoding: "utf8",
    }),
    "",
  );
  const project = path.join(root, "godot-project");
  await mkdir(path.join(project, "addons"), { recursive: true });
  if (!(await exists(path.join(project, "addons/vrm"))))
    await cp(addon, path.join(project, "addons/vrm"), { recursive: true });
  await writeFile(
    path.join(project, "project.godot"),
    'config_version=5\n[application]\nconfig/name="Rigloom independent VRM verification"\n[rendering]\nrenderer/rendering_method="gl_compatibility"\n[editor_plugins]\nenabled=PackedStringArray("res://addons/vrm/plugin.cfg")\n',
  );
} else if (process.argv[2] === "drum") {
  assert.ok(
    process.argv[3],
    "Pass the read-only drum-vrm source checkout path.",
  );
  const source = path.resolve(process.argv[3]),
    snapshot = path.join(root, "drum-vrm");
  assert.notEqual(source, snapshot);
  const before = execFileSync(
    "git",
    ["-C", source, "status", "--porcelain=v1", "--untracked-files=all"],
    { encoding: "utf8" },
  );
  const tree = execFileSync(
    "git",
    ["-C", source, "ls-tree", "-rz", pins.drumVrm.revision],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const [description, file] = line.split("\t"),
        [mode, type, hash] = description.split(" ");
      assert.equal(type, "blob");
      return { mode, hash, file };
    });
  if (!(await exists(snapshot))) {
    await mkdir(snapshot);
    const archive = execFileSync(
      "git",
      ["-C", source, "archive", pins.drumVrm.revision],
      { maxBuffer: 64 * 1024 * 1024 },
    );
    execFileSync("tar", ["-x", "-C", snapshot], { input: archive });
  }
  for (const entry of tree) {
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
  assert.equal(
    execFileSync(
      "git",
      ["-C", source, "status", "--porcelain=v1", "--untracked-files=all"],
      { encoding: "utf8" },
    ),
    before,
  );
  await writeFile(
    path.join(root, "drum-source.json"),
    JSON.stringify({ commit: pins.drumVrm.revision, tree }, null, 2),
  );
  console.log(
    "Snapshot verified. Run npm ci and npm run build inside .local/compatibility/drum-vrm.",
  );
} else
  throw new Error(
    "Usage: node scripts/compatibility/prepare.mjs godot | drum <source checkout>",
  );
