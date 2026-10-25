# Handoff — 2026-10-26

## Current automatic-weight follow-up (#37)

The owner explicitly authorized #36 review/merge and further #8 automatic quality. #36 merged as `c5386caad4b9c53d4823a389c0d9ebd0c14c83b5` after source review, successful exact-head CI, release build/format and repeated 44-case dev/static runs including private models. No blocking finding.

Branch `codex/geometry-aware-weights` implements #37: `surface-v3-experimental` filters remote influences reintroduced by smoothing using continuous distance support. No manual attachment is added to either automatic sample. All 32 poses and rejected alternatives are recorded in [the evidence](verification/surface-support-2026-10-26.md). Average gains are small; some shoulder/edge metrics regress. #8 remains open for semantic ambiguity, garments, volume and representative resource budgets.

Next: review the new PR and compare locally at http://127.0.0.1:5173/scripts/quality/viewer.html → Current v2 / v3. Product tests use fresh private `.local/weight-quality-support-2026-10-26/v3` inputs; their source and placement files can be opened in the app. Old benchmark folders remain intact. 91 native tests, Clippy, release WASM/build, and 44 browser cases in each dev/static mode passed, including actual elbow-placement edits with native/WASM byte parity. The PR owns the final head and CI result. Do not merge the new PR, release or deploy without a new owner instruction. Keep drum-vrm unchanged.

## Previous rigid-correction checkpoint (#35)


The authorized #32 → #34 review/merge batch is complete. #32 merged as `16bc9166eed1cc5aae58580f71d259dd4fb97cbc`; #34 was retargeted to main, incorporated main, revalidated and merged as `b59db3fc5e18da54e0cee82dcc7993659694c6e0`. Local review reran 88 native tests and 39 browser cases per dev/static mode for #32; #34 reran build/format and 42 cases per mode including both actual models. Both final heads passed Verify CI.

Branch `codex/rigid-surface-groups` implements #35, a bounded #8 correction slice: Rust-reported surface groups expand to existing component overrides, with mixed-state display and a viewport outline of the containing surface. Selecting a rigid target requires explicit user intent. No automatic weighting, source format or placement schema changes. See [new evidence](verification/rigid-accessory-2026-10-26.md); #8 remains open for automatic close-body/clothing ambiguity, severe bends and browser budgets.

Local test: http://127.0.0.1:5173/ while `npm run dev` runs. Open example → Rig → Initial weights → Surface group / Target → Attachment → Preview deformation. Use Connected part for individual changes; Deform restores automatic weights. Local actual-model reproduction uses `.local/weight-quality-review-2026-10-26/seed/source.glb` and its placement, then surfaces 6/0, 7/0 and 8/0 → spine. These are explicit reviewed sample choices, not product defaults. Keep sample geometry/screenshots private.

Next: owner review of the #35 PR and local correction workflow, then choose another remaining #8 gate. No merge of the new PR, release or deployment is authorized. Keep drum-vrm unchanged. Historical checkpoints retain their original scope and measured results.

## Current #8 quality follow-up

The owner authorized actual-model deformation validation and improvement through #8 and a PR on 2026-10-25. Branch `codex/weight-quality` adds surface v2 compact-distance priors and local-only comparison tooling. All four prior PRs (#26/#27/#29/#31) are merged; #31 merge is `95633279a73af602afa535a45b249be01e4a542e`.

[Measured evidence](verification/weight-quality-2026-10-25.md) records two official samples, all 32 poses, native/WASM byte parity, 88 Rust tests and 39 browser tests per dev/static mode. Remote influence is reduced; mechanical attachments and other natural-deformation gates remain unresolved. #8 stays open. The PR owns final head/CI/review status. Next: owner review of the PR and actual-model results; do not merge, release or deploy without a new instruction. Full #9/#10 and #2 remain separate. The user-provided quadruped is outside the humanoid generator's scope and remains unchanged.

Local test copies/placements live in `.local/weight-quality/`; comparison is at `http://127.0.0.1:5173/scripts/quality/viewer.html` while the local dev server runs. Open `twist/source.glb` → Rig → Load placement (`twist/placement.json`) → Preview deformation. These geometry-only derivatives intentionally omit textures/morphs/constraints and are not general-purpose conversions. No external models enter Git/public assets.

## Completed ordered-merge checkpoint

The owner authorized #26 → #27 → #29 → #31 review/merge on 2026-10-25, with each successor retargeted to main and revalidated after its predecessor merged. This supersedes historical merge restrictions below, without authorizing release/deployment or further implementation.

| PR | Reviewed head | Merge commit | Re-executed local checks |
|---|---|---|---|
| #26 | 5d2de6078aea6aedf410a2388f817a2e35df689b | 17f4bf989b0a31d0b3a301626af0f24cf3a997c2 | 81 native; build/lint/format; 26 browser cases per dev/static mode |
| #27 | 8878b26afe285dea67c8950b69daf8b4eb0b99ea | f0f980003e5989212078c24ca732db75eca14ce3 | 87 native; build/lint/format; 31 browser cases per mode |
| #29 | 2e65dfac12b0d055dab435035860ab92e85512d9 | e17b230499bf9ff3a601560f331b6d8740f7ac26 | build/format; 34 browser cases per mode |

Each merged PR passed verify CI on its final head. [PR #31](https://github.com/postmelee/rigloom/pull/31) is the final batch review and owns its exact final head, CI and merge result. That batch is complete; the newer #8 authorization above governs current work. The local app remains the test entrypoint. #7 is closed; #8 stays open for representative deformation/algorithm/performance evidence. Full #9/#10 and #2 remain incomplete. No public release/deployment exists.

## Historical implementation checkpoints
Public MIT repository: https://github.com/postmelee/rigloom. Local target: /Users/melee/Documents/ChatGPT/rigloom. Independent of drum-vrm; do not modify or clean its checkout.

M0–M4 milestones and #1–#12 execution issues exist. Initial requirements, bilingual README/guides/release policy, architecture, ADR and research/license gates are prepared. M0 research is not complete: original Pinocchio source/licensing, algorithm experiments and module-level licensing remain open. M1 and M2 remain incomplete.

Foundation [PR #13](https://github.com/postmelee/rigloom/pull/13) merged at `641a074558be67b370d73a201cd5e5be5af6910e`. GLB inspection [PR #14](https://github.com/postmelee/rigloom/pull/14) merged at `4e1e11cda89518281c16facf5ecc2a098de6c8d5`: Rust inspection → WASM Worker → Three.js static preview/report. #1 and #3 are closed.

Mapping/bind [PR #21](https://github.com/postmelee/rigloom/pull/21) merged at `2f9ba270c28c904f0bb7fde8fd772681559ec09c`; #4 is closed. It adds semantic mapping suggestions/overrides, required/unique/hierarchy checks, existing transforms/inverse binds/influences validation, and mapping JSON save/load bound to the source SHA256. Review fixed accessor alignment before merge. Final CI passed; executed local checks and limitations are in validation.md. Inspection schema is 2; mapping-file schema is 1.

The owner subsequently approved [#5](https://github.com/postmelee/rigloom/issues/5) implementation through its issue and PR, with a local server/request for browser interaction if manual input is needed. The delivered #5 work includes VRM 1.0 serialization, explicit metadata/usage permissions, source pose/rights confirmations and conversion report downloads. It preserves source BIN bytes, indices, transforms, skins, embedded PBR resources and non-tangent morph data. VRM tangent references are omitted and reported; tangent-only morph targets are blocked. Original glTF animations/cameras remain in the file and are reported as unused by VRM runtimes. No skin generation, MToon conversion, expression/look-at/physics generation or pose rebaking is included. See architecture.md for contracts and docs/validation.md for executed evidence; issue #5 and its PR record the exact head and CI result. PR #22 was reviewed and merged at `0043eb880b7950947bdcce4a2f8869e989faeb98`; #5 is closed. Implementation remains unreleased.

## UI and current compatibility work

The owner requested #23: simplify the interface using drum-vrm as a read-only reference and run a local preview. The UI branch `codex/simple-workspace` was retargeted from the export branch to main after PR #22 merged. PR #24 merged at `a3ecb6121e9ec0aa8c9a21320f8c873e9f9da3e4` after review and revalidation; #23 is closed. It replaces the decorative three-column layout with a compact toolbar, large viewport and one Model/Mapping/Export panel, native-like controls, and matching light/dark UI and canvas. Theme choice persists; Escape closes a panel. Source validation and export semantics are unchanged. [PR #24](https://github.com/postmelee/rigloom/pull/24) records the UI review, revalidation and final merge state. The localhost preview is started on port 5173 for this review; it is not public deployment and its process availability must be checked in later sessions.

## Previous implementation sequence
1. PR #25 was reviewed, its three browser compatibility cases and Godot/drum local checks rerun, and merged at `ac046acca9e1342b05330542d7b1346a1f38f9f4`. #6 is closed. The original checkout of drum-vrm remains outside this task's write scope.
2. The owner now authorizes continuing to a manually testable unrigged placement/initial-skin workflow. PR #26 adds Rust frame/bounds/joint validation, world-axis handles, numeric/mirror edits, undo/redo/reset and source-bound placement JSON. Its head 5d2de6078aea6aedf410a2388f817a2e35df689b passed CI. [PR #27](https://github.com/postmelee/rigloom/pull/27), stacked on #26 from `codex/m2-initial-skin`, adds experimental segment/surface weights, exact rigid component attachments, separate edit/preview, elbow/knee bends, generated GLB/report and the existing VRM export flow. Original source is retained; edits/cancellation/replacement discard derived output. Both PRs have now merged through the ordered review recorded above. Local checks passed 87 native tests and 31 browser cases in each development/static mode.
3. Full #9 motion-quality and #10 project editing, #11 corrections/fingers and #12 broad compatibility remain separate. No universal auto-rigging claim.

## Restrictions and open uncertainty
No release approval exists. No tag, Release, public hosting deployment or model release inclusion has occurred. No automatic merge. Read docs/release-policy.md before release preparation. The current #7/#8 local testability scope is authorized; later expansion and PR merges outside the explicitly approved #26/#27/#29/#31 batch need owner direction. File/schema/numeric checks do not certify T-pose, rights, artist intent or natural deformation. User exports are not exhaustively schema-certified or independently loaded at runtime. The #8 evidence above provides limited actual-model comparisons and two local runtime observations; broader browser budgets and fidelity remain unqualified.

## Local development
Use `git status` to confirm the current branch. Source, npm dependencies and generated WASM are available locally. `npm run dev` starts a localhost-only session; automated validation stops its own servers. Generated fixtures, cached pinned schemas and local execution logs live under ignored `.local/`. The dev-only schema/loader checks need the immutable schema URLs on a cold cache; no schema source or downloaded model is committed. There is no mandatory manual browser operation for the generated regression fixtures. Mapping files preserve choices only; they are not editable projects. M1 #6 is merged. M2 has a locally testable initial workflow; algorithm quality, full diagnostic motions/project editing and later corrections remain incomplete.

## Documentation rollback
The owner requested undoing both [PR #17](https://github.com/postmelee/rigloom/pull/17) and [PR #18](https://github.com/postmelee/rigloom/pull/18). [Issue #19](https://github.com/postmelee/rigloom/issues/19) / [PR #20](https://github.com/postmelee/rigloom/pull/20) restored the previous README/README.ko.md, docs layout and working rules. Hyper Waterfall files/specs/mydocs were removed; history remains in Git. The rollback changed no product source, tests, dependencies or CI and merged as `fa2229800d23462f9a8eca57a06565b836381a5b`; #19 is closed. Later approvals enabled #4 implementation/reviewed merge and #5 implementation, followed by reviewed merges of #22 and #24. Release/deployment still need explicit batch approval.

The drum-vrm integration snapshot is commit `d8dfab38cefc3bffd6edc0b88643d02ff829af73`; its tracked files are verified against Git blob hashes. The source checkout was read only by this task. Concurrent uncommitted changes appeared there during verification and were neither copied into the pinned snapshot nor altered. No cleanup, checkout switch, build or server was run in that source directory.

## Owner testing checkpoint

Local URL: http://127.0.0.1:5173/ (verify process availability on resume). Choose **Open example** to enter Rig with the original standard model and keyboard focus; no local file selection is needed. For a personal model, Open GLB → choose file → Rig. `node scripts/unrigged-fixture.mjs` creates `.local/initial-skin/unrigged-{standard,short-wide,asymmetric}.glb`. Open a source under Rig, place joints using Front/Side, Preview deformation, inspect Bend/Angle, then Edit joints or save rigged GLB/report. Explicit Export permissions are still required for VRM. Original private models stay uncommitted. T/A-pose static core GLB is accepted for initial skinning; animation/morph inputs are blocked in that path, existing rigs remain preserved. Generated weights are experimental and may attach nearby body parts incorrectly. See the bilingual guide and research/initial-skin.md. No mandatory additional user operation is needed for automated fixtures; real-character review is now possible locally.

## Keyboard follow-up (#28)

The owner requested placement shortcuts. Branch `codex/joint-keyboard-shortcuts` stacks on #27: Cmd/Ctrl undo/redo, world X/Y arrows, Alt up/down Z, Shift fine steps, bracket joint selection and 1/2/3 views. Help and 1 mm/1 cm/10 cm step choices are collapsed under Rig. Keyboard input uses existing mirrored edits/history; held nudges are one undo gesture, and form/IME/busy/preview contexts are guarded. Release WASM/TypeScript/static build, JS formatting and all 34 browser scenarios passed in each development/static mode; direct localhost X/Z movement and Cmd+Z were also checked. PR #29 has now merged after #26/#27 and main retargeting/revalidation; see the current checkpoint. No release/deployment authorization.


## Camera and example entry follow-up (#30)

The owner requested keyboard zoom/pan/orbit and a repeatable route to the demonstrated screen. Branch `codex/keyboard-camera-example` stacks on PR #29 (`codex/joint-keyboard-shortcuts`, head `1376420e19b42bc8f12c645dac41e2c1b7b2d2bf`). Open example loads the original procedural standard model through cancellable/revisioned inspection, enters Rig and focuses the canvas. Viewer keys: +/= and − zoom, I/J/K/L orbit, Shift+I/J/K/L pan, F fit, 1/2/3 presets. Camera-only controls also work in preview or with Rig closed; native forms/IME/browser modifier combinations are preserved. Help stays collapsed under View keys. No native semantics, dependencies or external assets changed.

Build, formatting and all 37 browser scenarios passed in each development/static mode. Direct localhost inspection confirmed one-click entry, focused canvas and camera movement; source-bound placement/history invariance is covered by the browser tests. PR #31 has been retargeted to main after the approved #26 → #27 → #29 merges. Its review records final revalidation and merge status. Issue #30/its PR record the final head and CI. No release, deployment or drum-vrm changes. The example is a coarse original test mesh, not a production-quality avatar; skinning limitations remain unchanged.
