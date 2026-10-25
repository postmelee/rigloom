# Rigloom

[한국어](README.ko.md) · [User guide](docs/guide/en.md) · [Roadmap](docs/plan.md)

An independent browser tool for preparing humanoid characters with Rust, WebAssembly and Three.js. Planned workflow: **GLB → inspect or place joints → skin → preview and correct → VRM 1.0**.

**Status: early development, not released or deployed.** The [#5 implementation](https://github.com/postmelee/rigloom/issues/5) adds VRM 1.0 export for existing rigs to GLB inspection, humanoid mapping and bind/weight checks and is merged through PR #22. Enter attribution and every usage permission, confirm the source pose and rights, then save the VRM and conversion report. Mapping choices can also be saved for the exact source GLB. The #6 compatibility checks cover three original proportion-varied fixtures in three-vrm, an independent Godot VRM viewer and a pinned local drum-vrm snapshot; PR #25 is merged; these checks do not certify arbitrary models. PR #26 adds unrigged joint placement. The stacked [PR #27](https://github.com/postmelee/rigloom/pull/27) adds experimental weights, component attachments, elbow/knee preview, generated GLB and VRM export. PRs #26 and #27 are merged. [PR #29](https://github.com/postmelee/rigloom/pull/29) adds joint keyboard editing, and [PR #31](https://github.com/postmelee/rigloom/pull/31) adds camera keys and Open example. Their review and merge records are linked; all features remain unreleased. Full project restore and production-quality skin correction remain future work. M2 semi-automatic rigging is the core MVP; M1 is only a prerequisite.

Initial product scope is a self-contained glTF 2.0 GLB containing one character, possibly multiple meshes, with an existing rig or an unrigged T/A-pose surface. The current inspector is narrower: one scene, dense triangle geometry, embedded BIN/resources, core glTF materials, no extensions or URI resources (including data URIs). Export requires an existing or generated skin and a source prepared in T-pose, facing +Z, with right-handed Y-up coordinates in meters. These conditions are user-confirmed, not automatically verified or corrected. The exporter preserves the original BIN, skin and supported PBR data, reports omitted tangent references and retains animations/cameras as unused VRM data. Passing checks does not certify deformation quality or compatibility with every VRM application. See the [supported formats and troubleshooting guide](docs/guide/en.md).

## Local development

Requires Rust 1.94.1, Node 24.15.0, npm 11.12.1 and wasm-pack 0.15.0. Dependencies and lockfiles are pinned. Install Rust's wasm32-unknown-unknown target first.

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.15.0 --locked
npm ci
npm run build
npm run dev
```

Open the localhost URL printed by Vite and choose **Open example** to load the original unrigged test model directly into Rig editing. See the [keyboard and camera controls](docs/guide/en.md#camera-keyboard-shortcuts). `npm run fixtures` creates original tiny test GLBs in ignored `.local/fixtures/`. They test structure, not humanoid quality.

```sh
cargo test --workspace --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo fmt --all -- --check
npm run check
npx playwright install chromium
npm run test:e2e
```

Files are inspected in a browser Worker and rendered locally. No model upload service, telemetry or external runtime CDN is configured. External resource URIs are rejected before rendering; the browser tests check network behavior for synthetic fixtures. This is not a universal privacy/performance guarantee for every future integration. Development setup downloads dependencies. Export tests also fetch hash-pinned upstream schemas into an ignored cache; test-only schema and VRM loader dependencies are not part of the product bundle.

Rigloom prepares standard avatars; [drum-vrm](https://github.com/postmelee/drum-vrm) performs music-driven animation. Neither character-specific conversion rules nor a drum-vrm-only VRM dialect belong here.

[Milestones](https://github.com/postmelee/rigloom/milestones) · [Issues](https://github.com/postmelee/rigloom/issues) · [Architecture](docs/architecture.md) · [Handoff](docs/handoff.md) · [License ledger](docs/research/licenses.md) · [Release policy](docs/release-policy.md)

MIT for Rigloom code. Model conversion does not change source rights. No external model assets are included. Releases, deployments and model inclusion in public release artifacts require explicit owner approval for that batch; no automatic PR merge is authorized.
