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

## #5 VRM 1.0 export — 2026-10-25

Tested implementation commit: `bf7ea1334644f04b4fe432108b4b41a38f0255a7`. This record is a documentation-only follow-up. The final PR head and CI result are recorded in issue #5 and its linked PR. Environment: macOS arm64, repository-pinned Rust/Node/WASM tooling and Playwright Chromium with software WebGL. The owner approved implementation/PR publication; no merge, release, deployment or #6 integration was performed.

Executed on the final implementation:

- `cargo test --workspace --locked`: **78 passed** (21 inspection, 28 bind, 12 mapping, 17 export; empty suites excluded).
- Strict workspace/all-target Clippy, Rust formatting and JS formatting: passed.
- `npm run build`: release WASM, TypeScript and static build passed.
- `npm run test:e2e`: **19 passed**, 13.2 seconds.
- `RIGLOOM_PREVIEW=1 npm run test:e2e`: **19 passed**, 12.0 seconds.
- `git diff --check` / staged whitespace checks and 15 Markdown files / 35 local targets: passed.
- Static-server screenshots of the metadata form and completed export were visually inspected. Temporary localhost servers were stopped; no manual owner interaction was required.

Native export cases cover actual VRMC_vrm serialization, required attribution and explicit permission/confirmation fields, the complete 55-key mapping, existing reachable skin requirements, source/BIN identity including padding, optional attribution preservation, retained animations/cameras, multi-instance transforms, preview-only influence limits, bind-warning acknowledgement, tangent omission/tangent-only target rejection, malformed retained surface layouts/counts/alignment/finiteness, consistent morph targets/initial weights/base attributes, invalid empty resource arrays and truncated input. Source bytes are not rewritten.

The six new browser scenarios exercise explicit blank-by-default permission choices, real VRM/report downloads, metadata/mapping/source invalidation, bind warnings, blocked tangent-only targets, cancellation and source replacement while work is pending. Export settings are locked during work; changes after completion invalidate downloaded results. The successful export compares the entire parsed source/output JSON, allowing only the expected VRM additions and tangent-reference omissions, plus exact BIN identity and source/output SHA256 values in the report.

The actual Rust/WASM download passed complete glTF JSON and VRMC_vrm schema checks through Ajv 8.20.0 / ajv-formats 3.0.1 using the 47 URL/SHA256-pinned schemas in tests/schemas/manifest.json. Pins: glTF `8e798b02d254cea97659a333cfcb20875b62bdd4`, VRM `94e82dd346fa6cf0337c4421728640e5252dd38e`. An isolated browser page loaded those same bytes through @pixiv/three-vrm 3.5.5, independently of Rust serialization. Assertions cover metadata, all 15 mapped source-node references, original local hip matrix, both skinned mesh instances, inverse binds, weights, PBR color/metalness/roughness, actual decoding of the embedded 1×1 PNG and the preserved animation count. No image-decoder mock or hand-written VRM replaced the downloaded file in this acceptance test. The runtime fixture session emitted no cross-origin HTTP requests, POST/PUT/PATCH requests, page errors or console errors; test-process schema fetching is separate from model processing.

Initial integration exposed inaccessible exact names for permission selects and CSP blocking of the renderer's `fetch(blob:)` image decoding. Added stable accessible names and allowed local blob connections while retaining same-origin HTTP resource policy. The browser test now fails on console errors, including CSP/image-load failures. Native testing also caught accidental insertion of absent JSON properties during mutable indexing; serialization now preserves absent fields. Independent read-only reviews found no remaining blocking issue in exporter/resource preservation, bridge ownership, revision/source guards or form invalidation.

Fixtures are authored by scripts/export-fixture.mjs from the repository's original rig generator, including generated PNG bytes, morphs, animation samples and a camera. They are tiny data-preservation fixtures, not anatomical or motion-quality evidence. No external model/texture/animation binary is committed.

| Generated input | Bytes | SHA256 |
|---|---:|---|
| export | 5372 | `03500c47967fee10e123a43e8549537623954183ff21052440a7d77061028d44` |
| export-multi | 5704 | `d7237c22108a20116645f5d5c92d9edffda1fd952bb064d53e3c891efafa742e` |
| bind-warning | 5372 | `754379724dca8a60b0fd906e5d39be0bd5a26dae3376066f9c85354f4049d1ef` |
| tangent-only | 5348 | `dcf07b5d2e58d4633dd74e2643f9d73d37334e8e9154d78e230990d92ef18a68` |

Observed static outputs: main JS 658.68 kB (167.27 kB gzip), WASM 637.62 kB (224.74 kB gzip), worker JS 5.00 kB and CSS 6.25 kB. The existing Vite >500 kB chunk warning remains. Suite timings are not performance benchmarks. The three new direct packages are development-only; the product does not import the schema validator or VRM loader. Schema source text stays in an ignored, hash-verified cache because redistribution rights were not established; see the license ledger.

Remaining limits: source T-pose/+Z/Y-up/meters and permission authority are explicit user assertions. Runtime checks do not exhaustively validate glTF semantics or decode every input image; fixture schema/loader success is not a certificate for each user export. Stored-pose warnings do not establish artist intent or natural deformation. Extra renderer influence/transform limitations remain warnings; preserved data can exceed preview capabilities. Animations/cameras are retained but unused as VRM avatar behavior. No MToon, expressions, look-at, physics, constraints, new skinning, project persistence or joint editing is generated. A second viewer, representative real-character motion/performance and separately arranged drum-vrm integration remain #6 or later work. M1/M2 are not complete.

## #23 simplified workspace — 2026-10-25

Implementation commit: `1016fd63c165a63d464666f4b4347a208e707c63`, based on open export PR #22. The owner requested a minimal native-HTML-like design referencing drum-vrm and a running local preview. drum-vrm was read only; its checkout was not changed.

Replaced the decorative left rail, badges, icons and footer with a compact toolbar, large viewport and one Model/Mapping/Export inspector. Shared diagnostics retain actionable errors/warnings; generic disclaimers remain in documentation/downloaded reports. Export rights/pose confirmations and explicit permission choices are unchanged. Downloads appear when ready and long conversion details are collapsed. Light/dark changes both UI and canvas/grid, follows the system initially and remembers manual choices. Escape closes the inspector and restores focus; narrow screens stack the inspector below the viewport. Removed unused lucide and updated the license inventory.

Executed locally during this change:

- TypeScript, release WASM/static build, JS formatting and whitespace checks passed. Final copy-only empty-state reduction also passed type/format checks.
- Existing 19 browser scenarios passed on the development server (12.1 seconds), including actual schema/independent-loader export acceptance.
- Two additional development scenarios passed (2.2 seconds): theme persistence/panel keyboard behavior and a 390×844 viewport with mapping validation, export eligibility and no horizontal overflow.
- All 21 browser scenarios passed on the static server (10.8 seconds).
- Visually inspected 1440×900 light/dark mapping views, export/empty views and the 390×844 stacked layout. These were original generated fixtures, not downloaded character models.
- 15 Markdown files / 35 local link targets checked without missing files; npm reported zero known vulnerabilities after removing lucide.

No Rust semantics changed, so the native suite was not redundantly rerun locally for this UI-only task; the PR CI verifies the complete final head. Existing large JS bundle warnings and real-character/performance/VRM limitations from #5 remain. The requested development preview was started at http://127.0.0.1:5173/ and left running for owner review; later sessions must check availability. No PR merge, #6 implementation, release or public deployment occurred. Final CI and PR reference are recorded in issue #23.

## Owner-authorized review of #22 and #24 — 2026-10-25

Reviewed exporter preservation/error paths, WASM ownership, worker source/revision checks, export form confirmations/invalidation, and UI theme/panel/accessibility changes. No blocking finding remained. No #6 implementation, release or deployment is included.

- PR #22 exact head `f5fa7b994b2681d8ae43951d66f1469122d5f58a`: isolated local checkout passed all 78 native tests, strict Clippy, Rust formatting, npm clean install, TypeScript/release WASM/static build, JS formatting and all 19 browser tests on both development and static servers. Its verify CI was successful. Merged at `0043eb880b7950947bdcce4a2f8869e989faeb98`.
- PR #24 was retargeted to main after that merge. Local merge commit `be90b4aaa0c25147f635d7eb98f13cb77ac2b9e3` passed release WASM/TypeScript/static build, JS formatting and all 21 browser tests on both development and static servers (11.3 seconds each). This includes actual exported bytes checked by pinned schemas and the independent loader, plus panel/theme/mobile regressions. Follow-up changes only update documentation; the final PR-head CI is recorded in PR #24 / issue #23 before merge.
- Large-JS-chunk warnings remain. No representative external character, second viewer, natural deformation, measured resource budget or drum-vrm integration is claimed. User-owned existing-rig core GLB testing is available locally; generated fixtures only establish the tested control/data paths.

## #6 compatibility verification — 2026-10-25

Added original standard/short-wide/asymmetric skinned humanoid fixtures, two authored bend poses and repeat export/load/reset checks. All 24 browser scenarios passed on both development and static servers, including the three new actual WASM export scenarios. TypeScript, release WASM/static build and formatting passed. Native serializer behavior is unchanged; final PR CI also runs 78 native tests and strict Clippy.

The pinned Godot 4.5.1 / Godot VRM 2.0.1 editor-import/standalone-viewer path passed all three fixtures, including metadata, required bones, decoded texture/PBR values, neutral and two posed vertex multisets, reset and real rendering. Maximum measured world-space distance was 2.69e-5 m against a 1e-4 m tolerance. An exploratory direct runtime-import route was not accepted as evidence; see [compatibility.md](compatibility.md).

An isolated, source-hash-verified drum-vrm snapshot at `d8dfab38cefc3bffd6edc0b88643d02ff829af73` built successfully. All three actual exported files loaded through its UI and played/paused the demo. Its actual Rust/WASM engine and VRM adapter produced 193 hits per fixture, finite original-skinned vertices/poses/contact samples at ten requested timestamps, and exact repeated-time identity; no plan diagnostics or browser/console errors were observed. This task did not modify the source drum-vrm checkout; concurrent uncommitted source changes were left untouched. External test tools, models and screenshots remain ignored.

[Machine-readable observations](compatibility-results.json) contain input/output hashes, versions, sizes, errors and bounded integration observations. [Reproduction and limits](compatibility.md) distinguish local-only Godot/drum checks from the browser CI, and generated probes from real-character deformation quality. No release, deployment, PR merge or #7+ implementation was performed. Tested implementation commit and final CI are recorded in #6 and its PR.

## #7 placement foundation — 2026-10-25

Executed 81 native tests (three new frame/placement cases), strict Clippy, Rust formatting, release WASM/TypeScript/static build and all 26 browser tests on development and static servers. New browser cases cover depth coordinates, mirrored edits, undo/redo/reset, source-bound save/load, malformed joint ordering, frame scaling/undo and preservation-only behavior for existing skins. A fieldset matcher was corrected to assert the disabled action button; the DOM fieldset was already disabled. No generated weights or motion quality is claimed by this foundation PR. The following #8 slice will add generation and explicit edit/preview state.

## #8 locally testable initial skin — 2026-10-25

Final local implementation checks passed: **87 native tests**, strict Clippy, Rust formatting, release WASM/TypeScript/static build, JS formatting and **31 browser scenarios on each of development and static servers**. This adds six native skin tests and five browser workflows to the placement foundation. Browser cases cover standard/short-wide/asymmetric generation → preview → explicit VRM export → pinned schemas and separate three-vrm loader, deterministic regeneration, source BIN/material preservation, rigid settings persistence, invalid edits, cancellation and replacement. Native tests additionally evaluate per-instance bind/neutral preservation with transformed instances and a non-default frame, exact rigid weights, animation/morph rejection, existing-skin exclusion and the limited diffusion experiment.

The first browser pass exposed an ambiguous range label and the full regression suite caught loss of the original source report during placement preparation; both were corrected and the suites rerun successfully. Direct local UI verification covered a world-axis handle drag, Undo and a 120° elbow bend. View fitting was adjusted for narrow aspect ratios and programmatic camera changes now update view-button state. No new dependency was introduced. Existing large-JS-chunk warnings remain.

The new output is verified with three-vrm; the prior #6 Godot/drum numeric record applies to its original authored-skin fixtures and is not silently extended to these generated weights. PR #25 review reran its three compatibility cases and its independent Godot/isolated drum checks successfully before merge at `ac046acca9e1342b05330542d7b1346a1f38f9f4`. Placement PR #26 head `5d2de6078aea6aedf410a2388f817a2e35df689b` passed [verify CI](https://github.com/postmelee/rigloom/actions/runs/40149375495). The initial-skin PR records its exact final head and CI separately.

[Initial-skin experiment](research/initial-skin.md) records algorithm details and unresolved quality gates. Continuous anatomical regions, hand/thigh leakage, layered clothes, artist-authored models, broad motion quality and measured memory/performance are not certified. The experimental generation path rejects animations/morphs, limits work to 200,000 active vertex instances and never replaces an existing skin. No release/deployment or new PR merge was performed.

## #28 joint keyboard editing — 2026-10-25

Release WASM/TypeScript/static build, JS formatting and **34 browser scenarios on each development/static server** passed. Three new keyboard cases cover X/Y/Z movement, fine/configurable steps, mirror updates, Cmd/Ctrl undo/redo, held-key grouping, view/joint selection, native form/IME exclusion, hidden Rig scope and busy/generated-preview guards. Direct localhost UI verification moved hips X and Z from 0 to 0.01 and restored both with two Cmd+Z presses. Collapsed shortcut help and model focus are visible and keyboard accessible.

A formatting check initially stopped before the full browser runs; the test formatting was corrected before both successful full runs. Rust semantics and dependencies are unchanged, so the native suite was not redundantly rerun locally for this UI-only change. Final PR CI covers the complete head, including native tests. Existing skinning quality/performance limitations remain. No PR merge, release, deployment or drum-vrm source modification.
