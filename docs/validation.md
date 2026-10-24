# Validation record

Latest validation: see the PR #21 review section below. Earlier implementation/review records are historical and retain their original scope.

Executed 2026-10-24 on macOS arm64 with Rust 1.94.1, Node 24.15.0, npm 11.12.1, wasm-pack 0.15.0 and Playwright Chromium 156.0.8078.4 (software WebGL). Tested implementation commit: `03aa5e895f2885f919d9c33e45a5a990c055ed47`. The subsequent PR review adds accessor hardening; see the later review record for the current tested implementation. GitHub CI is recorded separately in the PR checks.

| Layer | Scope | State |
|---|---|---|
| Rust | GLB/schema/range/tree/position/policy tests on original synthetic geometry | Passed: 16 native tests |
| WASM | Build the same engine and execute from a browser Worker | Passed: release WASM build and browser execution |
| Browser | Multi-mesh/rigged load, URI/extension errors, cancellation, views/theme/report, observed no upload requests | Passed: 5 scenarios on Vite dev and 5 on static build |
| VRM serialization/round trip | Required humanoid/metadata, weights/binds/materials | Not implemented / not run |
| Independent VRM viewer | Blender add-on/UniVRM and loader comparison | Not run |
| drum-vrm integration | Separate local setup, no existing checkout changes | Not run |
| Skinning quality/performance | Difficult proportions/topology, representative memory/time matrix | Not implemented / not run |

Initial fixtures contain only one or two triangles (3 or 6 source vertices), with an optional one-joint skin. They validate mechanics, not humanoid anatomy, actual conversion fidelity, realistic rendering, safe maximum inputs or natural deformation. No production character models were downloaded.

## Executed commands

- `cargo test --workspace --locked`: 16 integration tests passed; empty unit/doc suites are not counted.
- `cargo clippy --workspace --all-targets --locked -- -D warnings`: passed.
- `cargo fmt --all -- --check`, `npm run check`, `npm run format:check`: passed.
- `npm ci`, `npm run build`: passed in the final local checkout.
- `npm run test:e2e`: 5 passed, 5.1 seconds total on Vite development server.
- `RIGLOOM_PREVIEW=1 npm run test:e2e`: 5 passed, 4.3 seconds total on local static build.
- `git diff --cached --check`: passed before implementation commit.

The browser scenarios cover multi-mesh input and report download, existing skin display, URI network rejection, extension/truncation diagnostics, delayed-worker cancellation/replacement, view buttons and theme. The observed synthetic sessions emitted no cross-origin HTTP requests or POST/PUT/PATCH uploads. This does not certify arbitrary future integrations. Visual screenshot inspection confirmed viewport/layout with generated geometry.

During development, tests exposed a fixture array-construction mistake, a Three.js material union type mismatch, a lint issue, and development CSS blocked by CSP. These were corrected before final passing runs. Development alone permits Vite's inline CSS injection; static builds retain same-origin styles. Final-path dependencies were reinstalled with npm ci rather than depending on copied executable links.

## Build size and remaining limits

Observed static outputs: main JS approximately 644.34 kB (163.20 kB gzip), WASM 425.28 kB (143.14 kB gzip), worker JS 2.76 kB and CSS 4.63 kB. Vite reports a >500 kB JS chunk warning; no optimization or performance-completion claim is made. wasm-pack built its matching wasm-bindgen CLI from source on this host. Build-tool warnings do not imply runtime tests failed.

Timings above are test-suite durations, not skinning benchmarks. Representative file memory, texture decoding budgets, deep-tree limits and browser support are unmeasured. No inverse-bind/weight certification, VRM serialization, independent VRM loader/viewer run or drum-vrm integration has happened. Full humanoid quality cannot be inferred from the synthetic triangles.

## Generated fixture identities

Source: original `scripts/fixtures.mjs` at the tested implementation commit. Files are created under ignored `.local/fixtures/`; no model binaries are committed. Rigged input has 3 vertices and 1 joint, surface input 3 vertices, and multi input 2 meshes/6 source vertices; all have 0 textures. Error fixtures deliberately declare unsupported resources/features.

| Filename | Bytes | SHA-256 |
|---|---:|---|
| extension.glb | 504 | `2c91f95531d98a2922d6e828258f0fe4220bc961c0e98d8922480b806ca35686` |
| external.glb | 504 | `c20d00393002e9d199d77ed75390ee9d637ccf47e8c5b3deca916f0a1b683c69` |
| multi.glb | 536 | `a727203968cd0ac104063cbc0d51377e1e1074b863b6bfd5920c89baff12330e` |
| rigged.glb | 840 | `5370ec4d85fb76765a7ef389bab5a18646ca4b71a6631c35dcc147fe07d6743a` |
| surface.glb | 456 | `8b42fd4833a8422b5f41ba2b89fa14446f31a86e441adbcd175e45b07940c78b` |

## PR #14 review — 2026-10-24

Tested fix commit: `53e7647e8b60714753bce02e126bd7ce7d6db3a9`.

Four malformed-input paths were reproduced as native panics at the original PR head: zero accessor count, mismatched POSITION shape, floating-point indices and an out-of-range POSITION accessor reference. The last one occurs inside gltf-json's validation hook; the others violate assumptions in its binary readers. Added explicit preflight checks and stable diagnostic codes, including shape/component/normalization variants.

Executed after the fix:
- `cargo test --workspace --locked`: 20 integration tests passed.
- `cargo clippy --workspace --all-targets --locked -- -D warnings`: passed; `cargo fmt --all` completed and CI independently checks formatting.
- `npm run build`: release WASM, TypeScript and static build passed.
- `npm run format:check`, `git diff --check`: passed.
- `npm run test:e2e`: 6 passed (5.8 seconds); `RIGLOOM_PREVIEW=1 npm run test:e2e`: 6 passed (5.2 seconds).

The new browser scenario checks all four malformed cases return reports and a subsequent valid rigged input still previews. No new dependencies, model assets, export, humanoid mapping or bind implementation were added. Existing fixture outputs remain unchanged by default. The initial size/timing figures above describe the original build, not a new performance benchmark. Final exact-head CI and merge SHAs are recorded in PR #14 and issue #3.


## #4 mapping and bind validation — 2026-10-25

Tested implementation commit: `10e33cc776c03e793c33749b219c07191b03e51e`. This record is a documentation-only follow-up; the final PR head and its CI result are recorded in issue #4 and the linked PR. Local environment: macOS arm64, the repository-pinned Rust/Node/WASM toolchain and Playwright Chromium with software WebGL. No release or deployment was performed.

Executed on the final implementation:

- `cargo test --workspace --locked`: **58 passed** (21 inspection, 25 bind, 12 mapping; empty suites excluded).
- `cargo clippy --workspace --all-targets --locked -- -D warnings` and `cargo fmt --all -- --check`: passed.
- `npm run build`: release WASM, TypeScript checking and static build passed.
- `npm run format:check`: passed.
- `npm run test:e2e`: **12 passed**, 6.9 seconds.
- `RIGLOOM_PREVIEW=1 npm run test:e2e`: **12 passed**, 6.6 seconds.
- 15 Markdown files / 30 local links: no missing file targets; `git diff --check` and staged whitespace checks passed.

New native coverage includes complete/partial/ambiguous mappings, optional-parent and helper-node hierarchy, invalid/duplicate references, explicit null overrides, deterministic JSON round trips and immutable input. Skin coverage includes nonidentity/rotated/nonuniform transforms, multiple mesh instances and skins, common bind-shape versus posed-rest warnings, omitted/surplus inverse binds, all influence sets, integer normalized weights, malformed accessor layout/count, nonfinite/negative/zero/summed weights and joint bounds.

Independent review identified and fixed five gaps before the final runs: raw matrix+TRS conflicts, local matrix shear, singular skinned-mesh transforms in the pinned renderer, inverse-bind stride and unused empty skins. Local shear and conflicting transforms are errors; composed world/IBM shear is permitted. Valid multi-set influences and singular skinned-mesh transforms are explicit preview limitations rather than silently changed source data. Native and release-WASM regressions cover these paths. A separate frontend review found no blocking stale-result, artifact-import or text-injection issue.

The browser scenarios cover the existing inspector plus full humanoid suggestions, manual duplicate/unassigned overrides, stale-report invalidation, SHA256-bound save/load round trips, mismatched/malformed mapping rejection, weight/bind errors, rest-transform and renderer limits, cancellation and replacement recovery. The synthetic mapping round trip emitted no cross-origin HTTP requests; the existing inspection scenario also observes no POST/PUT/PATCH upload requests. Screenshot inspection confirmed the viewport/inspector layout. These observations apply to the tested synthetic sessions.

Original fixtures come from `scripts/rig-fixture.mjs`; no downloaded model binaries or runtime dependencies were added. They use 15 mapped joints, no textures, and one or two triangle meshes (3 or 6 source vertices). The minimal surface is not an anatomical or deformation-quality test.

| Generated input | Bytes | SHA256 |
|---|---:|---|
| humanoid | 3020 | `a029591e4d007eb982afb24b9982921795bb6252c6a280aea44928f5adecdb3b` |
| humanoid-multi | 3164 | `27ff07b03cd0296ee7c19b6b47b709a9e224a001cd2080cba5ebce3c3dc87871` |

Observed final outputs: main JS 650.25 kB (164.99 kB gzip), WASM 538.96 kB (188.09 kB gzip), worker JS 3.51 kB and CSS 5.30 kB. Vite's >500 kB chunk warning remains; wasm-pack used its source-built matching binding CLI. Suite timings are not performance benchmarks.

Remaining boundaries: suggestions use names, not anatomical inference; mapping JSON only preserves node choices for identical source bytes; the `joint_world × inverse_bind` comparison does not establish artist intent or natural deformation. Full VRM serialization/independent viewer round trips, editable project persistence, new skinning, real-character quality and representative memory/performance tests remain unimplemented or unrun. No drum-vrm checkout or integration was modified. M1/M2 are not complete.


## PR #21 review — 2026-10-25

Tested fix commit: `d9b621b0511f7c89b41816a105d709894a654e4d`. The owner authorized review, necessary fixes/revalidation and merge of #21 only; #5 implementation and releases/deployment remain blocked pending a separate instruction. The final exact-head CI and merge outcome/SHA are recorded in PR #21 and issue #4.

Independent skin review reproduced a misaligned inverse-bind accessor that returned `preview_allowed=true` / `binds.valid=true` but failed in Three.js with `RangeError: start offset of Float32Array should be a multiple of 4`. The existing type/count/stride checks did not validate byte alignment. Added component-sized relative/absolute offset and stride checks, plus glTF's four-byte relative offset/stride rule for joint/weight vertex attributes. Offsets that cancel to an aligned absolute address are still rejected when the relative offset is invalid. Valid padded and interleaved data remain accepted. This implements the [glTF data alignment rules](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#data-alignment) without rewriting source data.

After the fix:

- `cargo test --workspace --locked`: **61 passed** (21 inspection, 28 bind, 12 mapping).
- Strict workspace/all-target Clippy, Rust formatting and JS formatting: passed.
- `npm run build`: release WASM, TypeScript and static build passed.
- `npm run test:e2e`: **13 passed**, 8.0 seconds.
- `RIGLOOM_PREVIEW=1 npm run test:e2e`: **13 passed**, 6.9 seconds.
- Whitespace and local documentation targets: passed (15 Markdown files / 30 local links).

New native cases cover relative/absolute/component/vertex alignment, valid padding and interleaving. The new browser case checks five malformed skin layouts fail before loading, then a valid file still previews with no page errors. The separate mapping and frontend reviews found no additional blocking issues. Previous synthetic-model and performance limitations still apply. No dependencies, external assets, exporter or deployment configuration were added. Updated WASM output is 539.77 kB (188.39 kB gzip); the existing Vite chunk warning remains.
