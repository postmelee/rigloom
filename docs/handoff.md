# Handoff — 2026-10-24

## State
New public MIT repository: https://github.com/postmelee/rigloom. Local target: /Users/melee/Documents/ChatGPT/rigloom. Independent of drum-vrm; its existing modified files/branch are not part of this task.

M0–M4 milestones and #1–#12 execution issues exist. Initial requirements, bilingual README/guides/release policy, architecture, ADR and research/license gates are prepared. M0 research is not complete: original Pinocchio source/licensing, algorithm experiments and module-level licensing remain open.

The first implementation work targets #3: Rust GLB inspection → WASM Worker → Three.js static preview and report. Validation and reviewable PR preparation are ongoing. Mapping, weights/binds validation, VRM export, joint editing, skin generation and project persistence are not implemented. M1 and M2 remain incomplete.

## Next sequence
1. Finish #3 verification and prepare separate foundation/implementation PRs without merging.
2. #4 semantic mapping and complete weight/bind validation, preserving original coordinate systems.
3. #5 real VRM serializer and explicit metadata/report; #6 independent loader/viewer round trip and separately arranged local drum-vrm integration.
4. #7 depth-aware placement and #10 project state; resolve #2 algorithm gates before #8 weights and #9 motion quality.
5. #11 corrections/fingers; #12 measured compatibility/performance.

## Restrictions and open uncertainty
No release approval exists. No tag, Release, public hosting deployment or model release inclusion has occurred. No automatic merge. Read docs/release-policy.md before release preparation. Current inspection is not VRM or skin-quality certification. Browser resource budgets and real-model fidelity are unmeasured.
