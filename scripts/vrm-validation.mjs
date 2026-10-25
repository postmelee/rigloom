// Test-only independent verification; never imported by the product bundle.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { build } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(
  await readFile(
    new URL("../tests/schemas/manifest.json", import.meta.url),
    "utf8",
  ),
);
const cache = path.join(root, ".local/schema-cache");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
let schemaPromise;
let loaderPromise;

async function fetchSchema(entry) {
  const filename = path.join(cache, `${entry.sha256}.json`);
  let bytes;
  try {
    bytes = await readFile(filename);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const response = await fetch(entry.url, {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(`Schema download ${response.status}: ${entry.url}`);
    bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(
      digest(bytes),
      entry.sha256,
      `Schema integrity mismatch: ${entry.name}`,
    );
    await mkdir(cache, { recursive: true });
    const temporary = `${filename}.${process.pid}.tmp`;
    await writeFile(temporary, bytes);
    await rename(temporary, filename);
  }
  assert.equal(
    digest(bytes),
    entry.sha256,
    `Cached schema integrity mismatch: ${entry.name}`,
  );
  return [entry.name, JSON.parse(bytes.toString("utf8"))];
}

async function schemas() {
  if (!schemaPromise)
    schemaPromise = (async () => {
      const ajv = new Ajv2020({
        strict: false,
        allErrors: true,
        logger: false,
      });
      addFormats(ajv);
      // Bounded downloads keep cold CI runs predictable; source text stays ignored.
      for (let offset = 0; offset < manifest.files.length; offset += 6) {
        const batch = await Promise.all(
          manifest.files.slice(offset, offset + 6).map(fetchSchema),
        );
        for (const [name, schema] of batch) ajv.addSchema(schema, name);
      }
      return {
        gltf: ajv.getSchema("glTF.schema.json"),
        vrm: ajv.getSchema("VRMC_vrm.schema.json"),
      };
    })();
  return schemaPromise;
}

export function decodeGlb(bytes) {
  const buffer = Buffer.from(bytes);
  assert.ok(buffer.length >= 20, "GLB header is truncated");
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, "GLB magic");
  assert.equal(buffer.readUInt32LE(4), 2, "GLB version");
  assert.equal(buffer.readUInt32LE(8), buffer.length, "GLB declared length");
  let json;
  let bin = Buffer.alloc(0);
  let chunk = 0;
  for (let offset = 12; offset < buffer.length;) {
    assert.ok(offset + 8 <= buffer.length, "GLB chunk header");
    const length = buffer.readUInt32LE(offset),
      kind = buffer.readUInt32LE(offset + 4);
    assert.equal(length % 4, 0, "GLB chunk alignment");
    const end = offset + 8 + length;
    assert.ok(end <= buffer.length, "GLB chunk bounds");
    if (chunk === 0) {
      assert.equal(kind, 0x4e4f534a, "First GLB chunk must be JSON");
      json = JSON.parse(buffer.subarray(offset + 8, end).toString("utf8"));
    } else {
      assert.equal(chunk, 1, "Only one BIN chunk is expected");
      assert.equal(kind, 0x004e4942, "Second GLB chunk must be BIN");
      bin = buffer.subarray(offset + 8, end);
    }
    chunk++;
    offset = end;
  }
  assert.ok(json, "Missing GLB JSON");
  return { json, bin };
}

/** Validates the complete glTF JSON and VRMC_vrm extension using pinned upstream schemas. */
export async function validateVrmSchemas(bytes) {
  const result = decodeGlb(bytes);
  const validate = await schemas();
  assert.ok(
    validate.gltf(result.json),
    `glTF schema: ${JSON.stringify(validate.gltf.errors)}`,
  );
  const extension = result.json.extensions?.VRMC_vrm;
  assert.ok(extension, "No VRMC_vrm extension");
  assert.equal(extension.specVersion, "1.0", "Expected VRM 1.0");
  assert.ok(
    result.json.extensionsUsed?.includes("VRMC_vrm"),
    "Missing extension declaration",
  );
  assert.ok(
    validate.vrm(extension),
    `VRM schema: ${JSON.stringify(validate.vrm.errors)}`,
  );
  return result;
}

async function loaderBundle() {
  if (!loaderPromise)
    loaderPromise = (async () => {
      const output = await build({
        root,
        configFile: false,
        logLevel: "silent",
        build: {
          write: false,
          minify: false,
          lib: {
            entry: path.join(root, "scripts/vrm-loader-browser.mjs"),
            name: "RigloomVrmValidation",
            formats: ["iife"],
          },
        },
      });
      const bundles = Array.isArray(output) ? output : [output];
      const code = bundles
        .flatMap((bundle) => bundle.output)
        .filter((item) => item.type === "chunk")
        .map((item) => item.code);
      assert.equal(code.length, 1, "Expected one isolated test loader bundle");
      return code[0];
    })();
  return loaderPromise;
}

/** Pass a dedicated blank Playwright page; real browser image decoding is used. */
export async function loadVrmInBrowser(page, bytes) {
  await page.goto("about:blank");
  await page.addScriptTag({ content: await loaderBundle() });
  return page.evaluate(
    (data) => window.RigloomVrmValidation.loadVrm(data),
    Array.from(bytes),
  );
}
