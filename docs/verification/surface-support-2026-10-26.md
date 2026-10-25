# Automatic surface-support filtering — 2026-10-26

Refs [#37](https://github.com/postmelee/rigloom/issues/37), parent [#8](https://github.com/postmelee/rigloom/issues/8). Base `c5386caad4b9c53d4823a389c0d9ebd0c14c83b5` after the authorized #36 merge. The PR owns the final head/CI. No new-PR merge, release or deployment is authorized.

## Change and evidence boundary

V2 suppresses remote influences in its initial distance prior, but ordinary indexed-neighbor smoothing can reintroduce them. V3 applies a continuous distance-support mask **after** the unchanged 32 smoothing steps and before normalized top-four selection. Full support extends to twice the nearest floored segment distance; smoothstep fades to zero at three times that distance. The existing confidence fallback preserves distant geometry; explicit rigid overrides still apply afterward. [Exact formula](../research/initial-skin.md#surface-v3-follow-up-37).

This is original project code, with no new algorithm implementation, dependency or source assets adopted. It does not add edges, weld seams, infer semantic ownership, preserve volume or change linear-blend deformation. The segment-v1 baseline remains byte-identical on all three profiles. The native coarse-triangle regression demonstrates an actual v2 failure: a zero opposite-arm prior becomes over 0.1 influence after smoothing; v3 removes that unsupported mass while retaining elbow blending, continuity and scale behavior in separate probes.

Use the same pinned Seed-san/Twist geometry-only preparation, reviewed provenance and canonical authored-weight reference as [the earlier report](weight-quality-2026-10-25.md). Fresh private copies live in `.local/weight-quality-support-2026-10-26/{v2,v3}`. Both automatic profiles have **zero rigid overrides**. Seed-rigid is a separate control retaining the same 609 explicit overrides; no manual correction is credited to automation. Older measured outputs are unchanged.

[Numeric JSON](surface-support-2026-10-26.json) records input/output/code hashes, environment, repeat timing and browser parity. [CSV](surface-support-2026-10-26.csv) contains all 32 poses for each profile/version and both rejected candidates. It retains full/active RMS, p95/max, remote vertex count and edge discrepancy rather than selecting only favorable poses.

## Results and tradeoffs

| Measurement | v2 | v3 |
|---|---:|---:|
| Twist mean full-body RMS, 32 poses | 9.939 mm | 9.926 mm |
| Twist left knee 90° full-body RMS | 3.933 mm | 3.871 mm |
| Twist left knee 90° remote vertices moving >1 cm | 141 | 135 |
| Seed automatic mean full-body RMS | 91.119 mm | 91.110 mm |
| Seed left knee 90° full-body RMS | 11.481 mm | 11.451 mm |
| Seed left knee 90° remote vertices moving >1 cm | 497 | 483 |
| Seed with unchanged explicit corrections, mean RMS | 13.312 mm | 13.301 mm |

The gains are small and **not uniform**. Above a 1 μm full-body RMS threshold, 8/32 Twist poses, 4/32 Seed automatic poses and 7/32 corrected Seed poses regress. Maximum increase is 0.0292 mm (Twist right shoulder 120°); Seed automatic reaches 0.00513 mm. Twist's average relative edge discrepancy rises from 0.016396 to 0.016494 (about 0.6%); Seed's falls slightly. Some remote-vertex counts also increase, e.g. Twist left elbow 90° 443 → 444. Do not interpret the mean as every pose getting better.

The bounded rationale for this experimental version is restoring local support under a reproducible smoothing failure, with slight mean/knee improvements and explicitly limited observed tradeoffs. It is **not** evidence of broad anatomical superiority. Side-by-side 90° knee views look nearly identical between v2/v3; both retain crease/volume differences from the reference. Twist shoulder/hair deformation and Seed's automatic mechanical-accessory failure remain clearly visible. Product WASM 120° elbow/knee renders were also inspected; no visual naturalness breakthrough is claimed. Private images are not committed or published.

## Rejected alternatives

- `candidate`: inverse squared edge length with a 1%-height distance floor, replacing uniform neighbor averaging. Seed automatic/corrected mean error worsened (91.122/13.323 mm); Twist improved only to 9.937 mm. Added cost and inconsistent quality did not justify adoption.
- `support-hierarchy`: expanded the support mask by one skeleton-parent/child hop. Mean gains were smaller (Seed 91.116 mm, Twist 9.931 mm, corrected Seed 13.309 mm) and some shoulder regressions remained. Extra hierarchy-dependent breadth was not adopted.

These alternatives and the final formula were evaluated on the same two samples, so the comparison is exploratory and not a held-out generalization result. Their full numeric poses are retained in the CSV.

## Verification and limits

- 91 Rust tests; rustfmt; all-target Clippy with warnings denied. New original probes cover reintroduced remote influence, finite/nonnegative/normalized output, determinism, elbow blending, continuous sampled transitions, 0.1×/10× scale, far fallback, disconnected surfaces and changed joint placement. Existing bind, rig-preservation and exact rigid-override tests remain active.
- Release WASM/TypeScript/Vite build; formatting and Git whitespace checks. Development/static browser suites each passed 44 cases including three local actual-model cases; ordinary CI runs 41 and skips private inputs.
- Actual-model native/WASM GLBs match byte-for-byte before **and after a real elbow-depth edit** of 2% head-to-foot height with mirroring off. Regeneration, placement restoration, cancellation/source replacement and preview/rest export separation remain covered. The edited pose has no authored-reference quality claim.
- Three repeat native runs per profile/version reproduced identical output hashes. Median surface-generation times (not a browser capacity benchmark): Seed 53.54 → 57.18 ms, Twist 45.53 → 43.70 ms, corrected Seed 56.61 → 56.96 ms. Short noisy runs do not establish a speedup. Masks are streamed instead of adding another 15-value array per vertex; peak memory was not measured.
- Simplified 15-ancestor reference, geometry-only derivatives and fixed canonical rotations retain the earlier evaluator's limitations. Full original avatar constraints, textures, morphs, secondary motion, arbitrary joint edits and held-out models are not qualified.

#8 stays open for close-body ownership ambiguity, hair/garments, armpit/groin, severe-bend volume, seam handling and representative browser-resource measurements. No external model or screenshot is bundled. See [reproduction](../../scripts/quality/README.md#current-v2v3-support-comparison).
