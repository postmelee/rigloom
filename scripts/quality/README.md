# Local weight-quality tools

These development-only tools reproduce [#8 evidence](../../docs/verification/weight-quality-2026-10-25.md). They download nothing and are not part of the product bundle. Keep model inputs, generated geometry, reference weights, full provenance and screenshots under ignored `.local/weight-quality/`. No model bytes belong in Git/CI. Review the pinned model notices and embedded metadata before acquiring/using copies; the repository license does not license those assets.

## Prepare reviewed files

After `npm ci`, use the already acquired official samples at the hashes in the evidence report. `real-model.mjs` accepts only those two hashes. Replace the absolute input paths below with your local copies:

```sh
node scripts/quality/real-model.mjs /absolute/Seed-san.vrm .local/weight-quality/seed
node scripts/quality/real-model.mjs /absolute/twist-official.vrm .local/weight-quality/twist
cargo build --release --locked --example skin_quality
node scripts/quality/compare.mjs .local/weight-quality/seed segment surface
node scripts/quality/compare.mjs .local/weight-quality/twist segment surface
```

The adapter explicitly bakes neutral geometry and discards textures/material extensions, morphs, animation/constraints and the original skeleton on a separate copy. Original skin weights are retained only in local `reference.json`, collapsed to 15 ancestors for the controlled comparison. This is not a supported generic VRM import/conversion feature. `source.glb` is unrigged; `request.json` is the native request; `placement.json` is the app-loadable source-bound placement. Do not use an arbitrary user model as a golden reference.

`compare.mjs` writes generated GLBs, weight reports, two 90° posed snapshots and all numeric poses. Native runtime includes generation/output write. The independent CPU pose evaluator applies one canonical rotation to selected descendants. Read the evidence's reference limitations before interpreting differences as naturalness.

## Preserve and reproduce v1

To compare the pre-change surface implementation, use an isolated checkout and the same example harness; keep baseline outputs in separate folders. Do not overwrite the working checkout or an earlier measured result.

```sh
git worktree add --detach /tmp/rigloom-skin-v1 95633279a73af602afa535a45b249be01e4a542e
mkdir -p /tmp/rigloom-skin-v1/crates/rigloom-core/examples
cp crates/rigloom-core/examples/skin_quality.rs /tmp/rigloom-skin-v1/crates/rigloom-core/examples/
cargo build --release --locked --manifest-path /tmp/rigloom-skin-v1/Cargo.toml --example skin_quality
cp -R .local/weight-quality/seed .local/weight-quality/seed-baseline
cp -R .local/weight-quality/twist .local/weight-quality/twist-baseline
RIGLOOM_SKIN_BINARY=/tmp/rigloom-skin-v1/target/release/examples/skin_quality node scripts/quality/compare.mjs .local/weight-quality/seed-baseline segment surface
RIGLOOM_SKIN_BINARY=/tmp/rigloom-skin-v1/target/release/examples/skin_quality node scripts/quality/compare.mjs .local/weight-quality/twist-baseline segment surface
```

Use fresh baseline folders; `cp -R` above assumes they do not already exist. The reported comparison does not modify the original v1 algorithm. The optional `seed-rigid` profile is a separate local copy with explicit component IDs from source nodes 6/7/8 assigned to spine (joint 1) in `request.json` and `placement.json`. The measured 609 components were verified against their authored reference. This is manual configuration, not model-specific product code or an inferred attachment. Generate its results with the same compare command if you create this profile.

## Browser and visual verification

```sh
npm run build
RIGLOOM_REAL_MODELS=1 npx playwright test tests/weight-quality.local.spec.ts
RIGLOOM_REAL_MODELS=1 RIGLOOM_PREVIEW=1 npx playwright test tests/weight-quality.local.spec.ts
npm run dev
```

The two opt-in tests use local geometry and placement files, assert native/WASM byte parity, validate reports, bend both elbow and knee, verify rest exports and regenerate. They save private screenshots/results beneath each sample's `browser/` folder. CI skips them when `RIGLOOM_REAL_MODELS` is absent; original fixture regressions still run.

Open `http://127.0.0.1:5173/scripts/quality/viewer.html` for reference/v1/v2 comparisons. Prepare both baseline folders first. Choose model, elbow/knee, front/side and full/joint detail; all cameras share a target and pose. Seed's optional manual profile must be generated before selecting it. This viewer uses flattened CPU-posed geometry to isolate weights; product WASM/skin loading is independently exercised by the tests. Missing local files produce a visible error instead of downloading assets.

For direct app review, Open GLB → `source.glb` → Rig → Load placement → `placement.json` → Preview deformation. Inspect bends and Edit joints. Save generated GLB/report before changing algorithm versions if exact output matters. The old `surface` method name remains valid but regeneration uses v2.

## Grouped correction follow-up

The opt-in `local Seed accessory` test uses fresh copies in `.local/weight-quality-review-2026-10-26/{seed,seed-rigid}` to preserve the earlier measurements. Copy only `source.glb`, `reference.json`, `request.json`, `placement.json` and `provenance.json` from the corresponding reviewed local profiles; then run the current `skin_quality` build and `compare.mjs <directory> surface` for each. The independently configured seed-rigid request must retain the reviewed 609 exact overrides. Nothing downloads or generates that intent automatically.

The browser test starts from the uncorrected Seed placement and assigns surfaces 6/0, 7/0 and 8/0 to spine through the UI. It verifies all 609 overrides, native/WASM byte equality, placement round trip and rest-byte preservation during bends. Private images/result JSON go to the seed-rigid `browser/` directory. See [the new evidence](../../docs/verification/rigid-accessory-2026-10-26.md); CI skips this test without `RIGLOOM_REAL_MODELS=1`.
