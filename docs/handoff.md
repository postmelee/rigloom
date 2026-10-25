# Handoff — 2026-10-25

## Current ordered-merge checkpoint

The owner authorized #26 → #27 → #29 → #31 review/merge on 2026-10-25, with each successor retargeted to main and revalidated after its predecessor merged. This supersedes historical merge restrictions below, without authorizing release/deployment or further implementation.

| PR | Reviewed head | Merge commit | Re-executed local checks |
|---|---|---|---|
| #26 | 5d2de6078aea6aedf410a2388f817a2e35df689b | 17f4bf989b0a31d0b3a301626af0f24cf3a997c2 | 81 native; build/lint/format; 26 browser cases per dev/static mode |
| #27 | 8878b26afe285dea67c8950b69daf8b4eb0b99ea | f0f980003e5989212078c24ca732db75eca14ce3 | 87 native; build/lint/format; 31 browser cases per mode |
| #29 | 2e65dfac12b0d055dab435035860ab92e85512d9 | e17b230499bf9ff3a601560f331b6d8740f7ac26 | build/format; 34 browser cases per mode |

Each merged PR passed verify CI on its final head. [PR #31](https://github.com/postmelee/rigloom/pull/31) is the final batch review and owns its exact final head, CI and merge result. On resume, inspect that PR: finish its authorized merge only if still open and all checks pass; if merged, collect owner feedback without starting later implementation. The local app remains the test entrypoint. #7 is closed; #8 stays open for representative deformation/algorithm/performance evidence. Full #9/#10 and #2 remain incomplete. No public release/deployment exists.

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
No release approval exists. No tag, Release, public hosting deployment or model release inclusion has occurred. No automatic merge. Read docs/release-policy.md before release preparation. The current #7/#8 local testability scope is authorized; later expansion and PR merges outside the explicitly approved #26/#27/#29/#31 batch need owner direction. File/schema/numeric checks do not certify T-pose, rights, artist intent or natural deformation. User exports are not exhaustively schema-certified or independently loaded at runtime. Browser resource budgets and real-model fidelity are unmeasured.

## Local development
Use `git status` to confirm the current branch. Source, npm dependencies and generated WASM are available locally. `npm run dev` starts a localhost-only session; automated validation stops its own servers. Generated fixtures, cached pinned schemas and local execution logs live under ignored `.local/`. The dev-only schema/loader checks need the immutable schema URLs on a cold cache; no schema source or downloaded model is committed. There is no mandatory manual browser operation for the generated regression fixtures. Mapping files preserve choices only; they are not editable projects. M1 #6 is merged. M2 has a locally testable initial workflow; algorithm quality, full diagnostic motions/project editing and later corrections remain incomplete.

## Documentation rollback
The owner requested undoing both [PR #17](https://github.com/postmelee/rigloom/pull/17) and [PR #18](https://github.com/postmelee/rigloom/pull/18). [Issue #19](https://github.com/postmelee/rigloom/issues/19) / [PR #20](https://github.com/postmelee/rigloom/pull/20) restored the previous README/README.ko.md, docs layout and working rules. Hyper Waterfall files/specs/mydocs were removed; history remains in Git. The rollback changed no product source, tests, dependencies or CI and merged as `fa2229800d23462f9a8eca57a06565b836381a5b`; #19 is closed. Later approvals enabled #4 implementation/reviewed merge and #5 implementation, followed by reviewed merges of #22 and #24. Release/deployment still need explicit batch approval.

The drum-vrm integration snapshot is commit `d8dfab38cefc3bffd6edc0b88643d02ff829af73`; its tracked files are verified against Git blob hashes. The source checkout was read only by this task. Concurrent uncommitted changes appeared there during verification and were neither copied into the pinned snapshot nor altered. No cleanup, checkout switch, build or server was run in that source directory.

## Owner testing checkpoint

Local URL: http://127.0.0.1:5173/ (verify process availability on resume). Choose **Open example** to enter Rig with the original standard model and keyboard focus; no local file selection is needed. For a personal model, Open GLB → choose file → Rig. `node scripts/unrigged-fixture.mjs` creates `.local/initial-skin/unrigged-{standard,short-wide,asymmetric}.glb`. Open a source under Rig, place joints using Front/Side, Generate weights, inspect Bend/Angle, then Edit joints or save rigged GLB/report. Explicit Export permissions are still required for VRM. Original private models stay uncommitted. T/A-pose static core GLB is accepted for initial skinning; animation/morph inputs are blocked in that path, existing rigs remain preserved. Generated weights are experimental and may attach nearby body parts incorrectly. See the bilingual guide and research/initial-skin.md. No mandatory additional user operation is needed for automated fixtures; real-character review is now possible locally.

## Keyboard follow-up (#28)

The owner requested placement shortcuts. Branch `codex/joint-keyboard-shortcuts` stacks on #27: Cmd/Ctrl undo/redo, world X/Y arrows, Alt up/down Z, Shift fine steps, bracket joint selection and 1/2/3 views. Help and 1 mm/1 cm/10 cm step choices are collapsed under Rig. Keyboard input uses existing mirrored edits/history; held nudges are one undo gesture, and form/IME/busy/preview contexts are guarded. Release WASM/TypeScript/static build, JS formatting and all 34 browser scenarios passed in each development/static mode; direct localhost X/Z movement and Cmd+Z were also checked. PR #29 has now merged after #26/#27 and main retargeting/revalidation; see the current checkpoint. No release/deployment authorization.


## Camera and example entry follow-up (#30)

The owner requested keyboard zoom/pan/orbit and a repeatable route to the demonstrated screen. Branch `codex/keyboard-camera-example` stacks on PR #29 (`codex/joint-keyboard-shortcuts`, head `1376420e19b42bc8f12c645dac41e2c1b7b2d2bf`). Open example loads the original procedural standard model through cancellable/revisioned inspection, enters Rig and focuses the canvas. Viewer keys: +/= and − zoom, I/J/K/L orbit, Shift+I/J/K/L pan, F fit, 1/2/3 presets. Camera-only controls also work in preview or with Rig closed; native forms/IME/browser modifier combinations are preserved. Help stays collapsed under View keys. No native semantics, dependencies or external assets changed.

Build, formatting and all 37 browser scenarios passed in each development/static mode. Direct localhost inspection confirmed one-click entry, focused canvas and camera movement; source-bound placement/history invariance is covered by the browser tests. PR #31 has been retargeted to main after the approved #26 → #27 → #29 merges. Its review records final revalidation and merge status. Issue #30/its PR record the final head and CI. No release, deployment or drum-vrm changes. The example is a coarse original test mesh, not a production-quality avatar; skinning limitations remain unchanged.
