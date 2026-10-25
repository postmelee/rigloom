# Actual-model weight quality — 2026-10-25

Refs [#8](https://github.com/postmelee/rigloom/issues/8). Base `95633279a73af602afa535a45b249be01e4a542e`; candidate algorithm `surface-v2-experimental`. The [numeric record](weight-quality-2026-10-25.json) identifies the exact Rust source blob, input hashes, environment and [all 32 poses per run](weight-quality-2026-10-25.csv). The PR owns the final commit/CI. No merge, release or deployment is authorized.

## Inputs and reference

Two already acquired official samples at VRM specification revision `94e82dd346fa6cf0337c4421728640e5252dd38e` were inspected locally:

| Sample | Author | SHA256 | Vertices / primitives |
|---|---|---|---|
| Seed-san | VirtualCast, Inc. | `624d0d554bc205bbdc33e22a68a2c3c20edebb3e573011ead8878a65e5329b23` | 34,059 / 21 |
| Twist | pixiv Inc., ©2022 | `12c2b97e95e700783a6a550dc0eee2d7880aeedccef9ae67bc4c5a2f0f2631a2` | 24,951 / 13 |

Primary notices: [Seed-san](https://github.com/vrm-c/vrm-specification/blob/94e82dd346fa6cf0337c4421728640e5252dd38e/samples/Seed-san/README.md), [Twist](https://github.com/vrm-c/vrm-specification/blob/94e82dd346fa6cf0337c4421728640e5252dd38e/samples/VRM1_Constraint_Twist_Sample/README.md), [VRM Public License 1.0](https://vrm.dev/licenses/1.0/). Both embedded metadata permit modification (`allowModificationRedistribution`); Seed-san requires credit, Twist does not. These are model-specific terms, not the repository MIT license. Full original metadata and derived hashes remain in ignored `.local/weight-quality/*/provenance.json`. No external bytes, derived geometry, weights or screenshots enter Git, CI or public assets. The adapter refuses hashes other than these two reviewed files and downloads nothing.

The test-only adapter bakes neutral positions with original joint-world × inverse-bind × authored weights, then makes a separate static core GLB. It deliberately drops textures/material extensions, morphs, animations, constraints and the original skeleton. This explicit **geometry-only benchmark profile is not a product VRM importer**. Original files are unchanged. Authored influences collapse to the nearest of 15 canonical humanoid ancestors; this omits twist/constraint behavior and secondary motion. The reference therefore measures controlled canonical bends, not fidelity to the entire original rig.

Placement is fixed at the authored joint positions, with the same centering/floor translation as the derived geometry. No joint fitting is credited to the weight algorithm. Left/right shoulder, elbow, hip and knee each rotate by 30/60/90/120 degrees (32 poses). Arms rotate about world Z, legs about world X; this is a stress sweep, not a natural-motion sequence. Independent CPU linear blend evaluation uses the same rotation and rest positions for reference/generated weights. Active-region RMS includes reference descendants with weight >0.01. Remote count includes reference weights <0.001 moving >1 cm. Edge error is mean absolute generated/reference edge-length difference divided by rest length; repeated triangle edges are counted, rest edges <1e-6 m excluded. All vertices, including accessories, remain in the full-body metric.

## Change and results

V1 leaves weak inverse-distance influences on unrelated body regions. V2 multiplies each inverse-fourth-power prior by a continuous compact-distance taper near the skeleton, then keeps the existing 32 anchored triangle-edge smoothing steps and normalized top four influences. No model name, authored weight or sample-specific branch enters the product. See [the algorithm contract](../research/initial-skin.md#surface-v2-follow-up).

| Automatic result | Surface v1 | Surface v2 |
|---|---:|---:|
| Twist: mean full-body RMS across 32 poses | 11.555 mm | 9.939 mm |
| Twist: left elbow 90°, full-body RMS | 3.869 mm | 3.029 mm |
| Twist: left knee 90°, full-body RMS | 7.403 mm | 3.933 mm |
| Twist: knee remote vertices >1 cm | 295 | 141 |
| Seed: mean full-body RMS across 32 poses | 92.058 mm | 91.119 mm |
| Seed: elbow active-region RMS | 2.578 mm | 1.394 mm |
| Seed: knee active-region RMS | 26.592 mm | 11.778 mm |
| Seed: knee remote vertices >1 cm | 1,164 | 497 |

No pose increases full-body RMS by more than 1e-6 m in these 64 comparisons. This does not imply superiority for arbitrary geometry or every quality measure. The unchanged segment baseline is retained in the numeric record. A rejected full-strength taper experiment worsened Seed's accessory error; the final rule smoothly fades back to v1 for geometry far from every segment.

Direct rendered comparison confirmed less pulling around the elbow/garment and knee. It also exposed remaining creases, limb volume changes and severe accessory motion. Seed's mechanical arm remains incorrectly pulled by the human elbow: automatic elbow full-body RMS is about 306 mm and maximum error 1.307 m. No automatic accessory inference is claimed. In a **separate manual correction run**, 609 indexed components belonging to the mechanical-arm primitives were explicitly assigned to spine using existing rigid overrides; their reference weights were checked to be entirely spine. Elbow full-body RMS then falls to 0.458 mm with zero remote vertices over 1 cm. This improvement depends on supplied attachment intent and is not credited to automatic weighting. Hundreds of component assignments are not a satisfactory manual UI workflow; grouping/selection improvements remain future work.

A user-provided local model was also inspected, without publishing its bytes/metadata. It is a quadruped with an existing skin (49 joint references), animation and a local shear diagnostic; the humanoid mapping is unassigned. It cannot validate this 15-joint humanoid generator. The product preserved the source and blocked preview/export rather than replacing its weights. Private details remain in `.local/weight-quality/giraffe-diagnosis.json`.

## Executed checks and measured bounds

- 88 Rust tests; `cargo fmt --all --check`; Clippy all targets with warnings denied.
- Release WASM, TypeScript and Vite build; Prettier checks.
- 39 browser tests in each development and static-preview mode, including the two opt-in actual-model cases. Ordinary CI runs 37 original-fixture cases and skips the two local-only cases.
- Both actual models produce **byte-identical native and WASM GLBs**, pass numeric/bind validation, keep preview angles out of saved rest GLBs and reproduce bytes after edit/regeneration. Existing source-preservation, cancellation, rigid-override and source-replacement regressions pass.
- Original synthetic arm-strip regression covers remote opposite-arm influence, retained elbow blending, continuous transitions, uniform-scale invariance and unchanged distant-geometry prior. It contains no third-party data.
- macOS 26.5.2 arm64, Apple M4 Pro, 24 GiB RAM; Rust 1.94.1, Node 24.15.0, Playwright 1.64.1 Chromium with SwiftShader. Single native release runs: Seed 56.75 ms, Twist 40.97 ms (generation plus output write, no cold process startup). Separate `/usr/bin/time -l` runs peak at 21,299,200 and 20,004,864 resident bytes respectively. Native RSS does not measure browser memory.
- An initial browser generation-to-preview observation was 622 ms / 558 ms for Seed / Twist. This includes worker/inspection/render adoption and automation scheduling; it is neither a repeated performance distribution nor a device-independent budget. Full-suite observations are retained locally. No browser peak-memory capacity claim; 200,000 vertices remains a work guard.

## Remaining gates

#8 remains open. Close-body ambiguity, continuous armpit/groin quality, overlapping/layered garments, large accessory selection, edited-placement robustness, severe bends and representative browser memory need further evidence. Distance falloff cannot infer which equally close surface belongs to which limb. There is no welding across primitive/index seams, volume solver or artist-quality guarantee. The collapsed reference is useful comparative evidence but not a ground-truth natural-deformation certificate. #2 alternative-solver adoption and full #9 motions remain separate. Existing rig preservation, including the quadruped source, is unchanged.

## Reproduction

See [local quality tools](../../scripts/quality/README.md). No model download or source stripping happens in normal application use. For local manual review, open the generated `source.glb` in Rig and load its `placement.json`, then Generate weights. The ignored `seed-rigid` profile additionally contains explicit attachment data. The development-only comparison viewer displays reference/v1/v2 side by side; it is not bundled into the app build.
