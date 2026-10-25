# Existing-rig compatibility verification (#6)

Implemented/unreleased; awaiting PR review. This is a bounded GLB → actual Rust/WASM VRM → independent import/pose comparison, not a VRM re-import feature in Rigloom or certification of arbitrary characters. [Measured results](compatibility-results.json) record the exact files, tools and observed errors. The issue/PR records the tested commit and final CI.

## Coverage

Three original MIT fixtures (`standard`, `short-wide`, `asymmetric`) have 15 required humanoid bones, ten skinned mesh instances, 120 vertices, 200 triangles, authored two-bone blends and an embedded original 1×1 PNG with core PBR. The fixtures vary proportions and one-sided limb lengths. They are segmented geometric probes, not finished character assets or a new skinning algorithm. Their generators are committed; generated GLB/VRM/PNG files stay in ignored `.local/compatibility/`.

| Layer | Executed checks | Boundaries |
|---|---|---|
| Rust/WASM export in Chromium | Upload and explicit permissions; two exports byte-identical; full pinned glTF/VRM schema checks; exact source/output BIN identity | Existing source rig; no pose repair or weight generation |
| Three.js / three-vrm | Import original GLB and actual output VRM; same neutral and posed surface/material data; elbow 60° about world Z, knee 45° about world X; reset; actual WebGL render | Same renderer family as product; independent of serializer only |
| Godot / Godot VRM | Separate engine/importer; recognized metadata and all required bones; actual render; material/texture values; neutral, elbow, knee and reset surfaces against the same exported-file reference | Official editor importer plus standalone viewer, not a second three-vrm wrapper |
| drum-vrm snapshot | Actual UI import and demo playback; actual VRM adapter + Rust/WASM planning; finite skin/pose/contact samples, out-of-order evaluation and repeated-time identity | Same three-vrm dependency; integration evidence, not the independent viewer |

The Three.js probe compares all 120 original/output vertices with an analytic two-joint linear blend reference. Its maximum component tolerance is 1e-6 m; source/output and reset comparisons use 1e-7 m. Godot may reorder vertices and change mesh numeric precision, so it matches each mesh's complete vertex multiset one-to-one with a 1e-4 m Euclidean tolerance (0.1 mm), preserving counts. It converts Godot's sRGB material color to linear RGB before comparison; metalness, roughness and decoded texture dimensions are asserted. Screenshots are supplemental evidence, not conformance criteria.

Observed maxima: three-vrm analytic component error 7.16e-8 m; Godot point distance 2.69e-5 m (0.0269 mm). All three variants render and pass both pose comparisons and reset. Repeated exports are byte-identical for fixed input/settings. Output hashes match across local development/static tests and the external probes.

The Godot exploratory direct `GLTFDocument` runtime path initially mis-ordered mesh conversion/retarget processing and produced mismatched skinning; it was not counted as passing evidence. The final harness uses the add-on's official editor import path without patching the engine or add-on. Logs are checked for `ERROR:` and `SCRIPT ERROR:` as well as exit status, because Godot can return status zero after a script error. The pin is for this accepted path only; runtime-import interoperability is not claimed.

## Reproduce

Use Node 24.15.0, Rust 1.94.1 and the repository's pinned lockfiles/build tooling. Generated outputs come from the browser download, not a hand-authored VRM substitute.

```sh
npm ci
npm run build
npm run test:compatibility
RIGLOOM_PREVIEW=1 npm run test:compatibility
```

All three scenarios also run in the ordinary `npm run test:e2e` suite and CI. They monitor external HTTP and browser exceptions. The existing #5 tests cover morph/resource disposition and cancellation/invalidation separately.

Godot verification uses the pinned macOS universal Godot 4.5.1 binary and unmodified Godot VRM 2.0.1 commit in [tools.json](../scripts/compatibility/tools.json). The preparation script verifies the binary SHA256; no engine/add-on/model binary is committed or bundled into the application.

```sh
node scripts/compatibility/prepare.mjs godot
npm run test:compatibility:godot
```

Run this with a macOS graphical session. It imports in a headless editor, then opens a short-lived viewer window for each fixture and saves actual frames. A headless-only parse cannot satisfy the render assertion. Other operating systems and engine versions have not been verified. Results/logs/screenshots stay under `.local/compatibility/`.

The drum-vrm source path is a read-only source of a pinned Git commit. The preparation script creates a separate snapshot and verifies every tracked file against that commit's Git blob hash. It neither copies uncommitted edits nor checks out, cleans, builds or starts a server in the source directory.

```sh
node scripts/compatibility/prepare.mjs drum /path/to/drum-vrm
npm ci --prefix .local/compatibility/drum-vrm
npm --prefix .local/compatibility/drum-vrm run build
npm run test:compatibility:drum
```

The runner validates snapshot hashes again and serves only that snapshot at `127.0.0.1:4186`, closing its browser/server afterward. UI tests import all three exported VRMs and play/pause the original 30-second synthesized demo. Numerical integration uses the snapshot's actual `loadLocalVRM`, `VRMHumanoidRigAdapter`, `EngineClient` and generated demo. Each variant produces 193 planned hits and samples times `[1, 0, 0.25, 0.5, 2, 5, 10, 20, 29, 1]`. Repeated-time pose values and original skinned vertices are identical. First-person `(erase)` duplicates are excluded from the original-surface count. Diagnostics and measured contact errors are recorded, not silently filtered. No external HTTP requests, write requests or console/page errors were observed in the final integration run.

## Executed environment and limits

Local: macOS 26.5.2 (25F84), Apple M4 Pro, Chromium 156.0.8078.4 with SwiftShader for browser tests; Godot reports OpenGL 4.1 Metal compatibility rendering. three-vrm 3.5.5 / Three.js 0.186.1 are shared with drum-vrm. Godot VRM uses a distinct engine and importer. These are functional observations, not timing/memory benchmarks. Full browser suites passed in development and static modes (24 scenarios each). TypeScript, release WASM/static build, formatting and local documentation links passed. Native Rust semantics are unchanged; final PR CI runs the native suite and strict Clippy as well.

The drum-vrm snapshot is `d8dfab38cefc3bffd6edc0b88643d02ff829af73`. Its source checkout was clean at first inspection; concurrent uncommitted work appeared during this task and was left untouched. Source checkout HEAD stayed at that commit during the recorded checks. This task only read the source; no source build/server/checkout/reset/cleanup was performed. The snapshot contains only the selected commit's tracked state and locally built outputs.

No representative external character, natural deformation, finger grip (fixtures have no finger bones), body/kit collision, clothing quality, arbitrary material/extension compatibility, image-quality equivalence, all-browser support, full 30-second motion sweep or resource budget is certified. The integration sampled ten requested times and briefly exercised playback; it did not export video or run a full-duration visual acceptance. #7–#12 remain separate authorized-work gates. #6 does not complete the M2 core MVP. No merge, release or deployment is authorized by this implementation request.
