# Validation record

Latest review validation: see the PR #14 review section below. The initial 16-test record is historical.

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
