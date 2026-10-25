# Rigid-accessory correction — 2026-10-26

Refs [#35](https://github.com/postmelee/rigloom/issues/35), parent [#8](https://github.com/postmelee/rigloom/issues/8). Base `b59db3fc5e18da54e0cee82dcc7993659694c6e0` after the authorized #32/#34 merge batch. [Numeric record](rigid-accessory-2026-10-26.json) identifies source blobs and model/output hashes; [CSV](rigid-accessory-2026-10-26.csv) retains all 32 poses before/after. The PR owns the final tested commit/CI. No release/deployment or new-PR merge is authorized.

## Problem and change

The previous evidence found Seed's mechanical accessory following the human elbow. Correcting its known attachment required 609 exact connected-component overrides. The product now groups native component records by source node instance and primitive, allowing those same corrections in **three target/attachment selections**. A selected surface is outlined; individual components remain editable; mixed settings are explicit. No automatic weights, Rust algorithm, source geometry, external dependency or placement schema change. Group intent is expanded to the same native component map.

A surface group is not a semantic body part. It can contain unrelated regions, and the outline is the containing surface's bounding box, not a component silhouette. The owner must identify the intended rigid joint. Deform removes only selected overrides and regenerates automatic weights. General painting, region inference, undo history for attachment edits and cached previews are outside this slice; Save placement preserves exact corrections.

## Inputs and method

Use the same reviewed Seed-san and Twist hashes, source revision, license/provenance and geometry-only preparation profile as [the preceding report](weight-quality-2026-10-25.md#inputs-and-reference). No additional model was acquired or published. Fresh ignored copies under `.local/weight-quality-review-2026-10-26/` preserve the older files/measurements. The source remains unchanged. Authored weights collapsed to 15 canonical ancestors are a controlled reference, not a naturalness certificate.

Native comparison was rerun with fixed authored joint placement and the unchanged v2 algorithm. The independently configured Seed correction assigns the 365/242/2 components of source surfaces 6/0, 7/0 and 8/0 to spine. Those three source-specific choices exist only in benchmark data/tests, never in product code. The product test starts with **no overrides**, performs the three selections through the UI, and requires the expanded map to equal all 609 independently configured entries. Its WASM GLB is byte-identical to the native corrected GLB. Saved placement reload and regeneration preserve those bytes; elbow/knee preview bends leave rest downloads unchanged.

## Results and remaining failure

| Seed measurement | Automatic v2 | Explicit grouped correction |
|---|---:|---:|
| Mean full-body RMS, 32 poses | 91.119 mm | 13.312 mm |
| Left shoulder 90°, full-body RMS | 461.761 mm | 13.451 mm |
| Left elbow 90°, full-body RMS | 306.182 mm | 0.458 mm |
| Left elbow 90°, remote vertices moving >1 cm | 3,379 | 0 |
| Left knee 90°, full-body RMS | 11.481 mm | 11.481 mm |
| Right hip 90°, full-body RMS | 40.473 mm | 40.473 mm |

No corrected pose increases full-body RMS beyond 1e-6 m in this 32-pose sweep. The automatic outputs remain unchanged, including Twist's 9.939 mm mean. This reproduces the earlier **manual** correction through practical UI; it is not a new automatic algorithm gain. Separate source groups and reused instances retain their original weight arrays in the synthetic regression.

Rendered dark-theme automatic/corrected 120° elbow views show the accessory staying in its intended rigid placement while the human arm bends. Selection outlines identify the containing surface, including the multi-fragment accessory. Knee review retains visible fold/volume limitations. Images remain private beside the benchmark results, not in this report or the repository. The independent CPU reference and all 32 numeric poses also retain the previous benchmark's limitations: simplified canonical motion, no textures/morphs/constraints/secondary motion and no anatomical-fit credit.

## Executed verification

- Release WASM/TypeScript/Vite build and formatting; changed-document relative links and Git whitespace checks.
- 44 browser cases in each development/static mode, including three opt-in actual-model cases. Ordinary CI runs 41 original-fixture cases and skips the three private-input cases.
- Added fragmented-surface regression covers all four components, a different primitive, a reused mesh instance, Mixed state, component/group switching, exact one-hot weights, automatic reset byte equality, placement round trip, cancellation and source replacement.
- Added actual-model UI case covers three grouped assignments → 609 entries → native/WASM byte parity, numeric validation, saved placement restoration and rest exports during bending. A targeted static rerun captures automatic/corrected views with the same camera and 120° elbow angle.
- The unchanged Rust code had 88 native tests, rustfmt and Clippy rerun during #32 review earlier in this session. No new native-test result is implied by this UI-only follow-up. No browser memory/performance budget is claimed.

#8 stays open for close-body ambiguity, deformable/layered garments, armpit/groin quality, severe bends/volume loss, edited-placement robustness and representative browser memory. Mesh/part correction helps where attachment intent is known; it cannot determine that intent automatically. #2 solver evaluation, full #9 motions and broader #11 correction tools remain separate. See [reproduction](../../scripts/quality/README.md#grouped-correction-follow-up).
