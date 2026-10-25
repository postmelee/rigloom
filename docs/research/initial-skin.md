# Initial skin experiment — 2026-10-25

Refs #2, #8. This owner-authorized slice makes unrigged placement and weight generation locally testable. It does **not** complete the research/production-quality gate in #2 or every acceptance criterion in #8. No external algorithm, solver, dataset, model weights or character asset was adopted. Implementation and procedural fixtures are original MIT project code. Pinocchio and libigl licensing/adoption gates remain unchanged.

## Original v1 comparison (historical)

`segment-v1-experimental` computes a normalized inverse-fourth-power prior from distances to the edited bone segments. The distance floor is 1% of head-to-foot height. Head/hand/foot endpoints extend by explicit fixed proportions; they are not inferred anatomy. `surface-v1-experimental` applies 32 deterministic Jacobi steps, each 35% original prior plus 65% neighbor mean. Neighbors are triangle-index edges within one primitive. Sorted adjacency and tie-breaking make repeated output deterministic. Both retain the largest four influences and normalize after truncation. The latter is anchored local smoothing, **not** a geodesic attachment solver, heat method or bounded biharmonic solver.

Neither method assumes a closed surface or fills holes. Separate primitives, index seams and disconnected clothes are not connected, even when their coordinates coincide. The distance prior can still give them influence from an unrelated nearby limb. Component attachments explicitly replace weights by a one-hot joint assignment for rigid parts. This is a manual escape hatch, not inferred clothing support.

## Executed evidence and its limits

- Native alternating-prior strip experiment: sum of squared successive differences in one influence falls from **3.0** to **0.13498725966312175** after diffusion. A second disconnected strip retains its exact independent label. This establishes smoothing and edge isolation only; it does not establish anatomical quality or reduced hand/thigh leakage.
- The native elbow probe retains competing upper/lower influences at their meeting point. A warning explicitly records that distance-based assignment can be wrong. No claim of superiority over existing skinning tools is made.
- Standard, short-wide and asymmetric original humanoid fixtures each have 10 disconnected surfaces and 120 active vertices. Actual release WASM produces GLB/VRM, passes numeric checks and pinned glTF/VRM schemas, opens in a separate three-vrm loader and reproduces identical bytes after returning to edit and regenerating.
- Native transformed-instance test independently evaluates joint-world × inverse-bind × source-position with generated influences. Both instances retain the prepared source position within 1e-5, despite distinct transforms and a non-default frame. Original input bytes and original BIN prefix remain unchanged.
- Explicit rigid attachment is exactly one-hot. Stale/out-of-range attachments, invalid joints, existing skins, animation and morph targets are rejected. Cancellation/source replacement cannot restore derived downloads. Original existing-rig regression tests remain active.
- Manual local UI: world-Y handle drag changed hips Y from 0.884 to 0.994744; Undo restored it. Elbow bending changed the rendered skin while Edit joints and generated downloads remained separate. Camera fit now uses both viewport dimensions.

These coarse fixtures do not measure continuous armpits/groin, hand near thigh, overlapping clothes, tiny extremities or artist-authored deformation quality. A production comparison against volume/geodesic methods and a separately recorded existing-tool result is still required. Representative browser timing and peak memory remain unmeasured. The 200,000 active vertex-instance guard bounds work; it is not a measured capacity recommendation. There is no model-specific branching.

## Reproduction

```sh
cargo test --workspace skinning -- --nocapture
node scripts/unrigged-fixture.mjs
npm run build
npx playwright test tests/placement.spec.ts tests/skinning.spec.ts
RIGLOOM_PREVIEW=1 npx playwright test tests/placement.spec.ts tests/skinning.spec.ts
```

Open `.local/initial-skin/unrigged-standard.glb` under Rig. Compare Method, inspect Front/Side, adjust joints, generate and bend. Save placement plus the original GLB to reproduce edits/settings; the weight report contains algorithm, source/output hashes and checks. Save rigged GLB to inspect in other tools. Preview angles are never baked into saved rest data. Full project migrations, brush corrections and the #9 motion suite remain separate work.

## Surface v2 follow-up

The #8 actual-model follow-up retains the segment v1 baseline and changes only the surface prior. Let `h` be the existing head-to-foot height, `d_i` each segment distance floored at `0.01h`, and `m = min(d_i)`. The original prior is proportional to `(m/d_i)^4`. V2 multiplies it by `1 - c + c*t_i`, where `t_i = max(0, 1 - (d_i/(3m))^2)^2` and `c = clamp((0.2h - m)/(0.1h), 0, 1)`. Normalize, then run the unchanged 32 anchored smoothing steps and normalized top-four selection. The report identifies `surface-v2-experimental`; method strings and placement schema remain compatible, but regenerating an old `surface` placement now uses v2. Preserve its generated GLB/report for exact old-output reproduction.

This continuous, scale-relative taper removes weak distant influences near the skeleton without hard nearest-bone labels. It fades back to the original prior for distant accessories because distance alone cannot establish their attachment intent. It adds no external algorithm/dependency or closed-volume assumption. Compact support belongs to the **prior**; diffusion can subsequently spread influence along indexed edges. Coincident seams, equally close limbs and disconnected garments remain ambiguous.

[Actual-model evidence](../verification/weight-quality-2026-10-25.md) compares two pinned local official models against authored canonical-weight references, including all 32 poses, browser/native parity, rendered observations, remaining failures and measured runtime. These observations extend rather than rewrite the historical fixture results above. #8 stays open; natural deformation and browser capacity are not certified. [Local tools](../../scripts/quality/README.md) never ship model assets or silently strip a product input.
