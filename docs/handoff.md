# Handoff — 2026-10-24

## State
New public MIT repository: https://github.com/postmelee/rigloom. Local target: /Users/melee/Documents/ChatGPT/rigloom. Independent of drum-vrm; its existing modified files/branch are not part of this task.

M0–M4 milestones and #1–#12 execution issues exist. Initial requirements, bilingual README/guides/release policy, architecture, ADR and research/license gates are prepared. M0 research is not complete: original Pinocchio source/licensing, algorithm experiments and module-level licensing remain open.

The first implementation work targets #3: Rust GLB inspection → WASM Worker → Three.js static preview and report. Implementation commit `03aa5e895f2885f919d9c33e45a5a990c055ed47` passed 16 Rust tests, strict Clippy, formatting/types, WASM/static build and five browser scenarios on both development and static servers. See docs/validation.md for evidence and limitations. Mapping, weights/binds validation, VRM export, joint editing, skin generation and project persistence are not implemented. M1 and M2 remain incomplete.

## Next sequence
1. Review foundation [PR #13](https://github.com/postmelee/rigloom/pull/13) and the stacked implementation PR on `codex/m1-glb-inspection` (base `codex/project-foundation`). Neither is merged. After owner-directed foundation merge, retarget the implementation PR to main and recheck the diff/CI; do not auto-merge.
2. #4 semantic mapping and complete weight/bind validation, preserving original coordinate systems.
3. #5 real VRM serializer and explicit metadata/report; #6 independent loader/viewer round trip and separately arranged local drum-vrm integration.
4. #7 depth-aware placement and #10 project state; resolve #2 algorithm gates before #8 weights and #9 motion quality.
5. #11 corrections/fingers; #12 measured compatibility/performance.

## Restrictions and open uncertainty
No release approval exists. No tag, Release, public hosting deployment or model release inclusion has occurred. No automatic merge. Read docs/release-policy.md before release preparation. Current inspection is not VRM or skin-quality certification. Browser resource budgets and real-model fidelity are unmeasured.

## Current local checkout
Branch `codex/m1-glb-inspection`, with source, npm dependencies and generated WASM available. `npm run dev` starts a localhost-only session; no server is left running by validation. Generated fixtures and local execution logs live under ignored `.local/`. GitHub CI outcome belongs to the PR's exact head; do not infer success from local tests. Browser inspection is an implemented/unreleased #3 slice, not completion of M1 or M2.
