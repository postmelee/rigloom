# Handoff — 2026-10-24

## State
New public MIT repository: https://github.com/postmelee/rigloom. Local target: /Users/melee/Documents/ChatGPT/rigloom. Independent of drum-vrm; its existing modified files/branch are not part of this task.

M0–M4 milestones and #1–#12 execution issues exist. Initial requirements, bilingual README/guides/release policy, architecture, ADR and research/license gates are prepared. M0 research is not complete: original Pinocchio source/licensing, algorithm experiments and module-level licensing remain open.

The first implementation work targets #3: Rust GLB inspection → WASM Worker → Three.js static preview and report. Reviewed implementation commit `53e7647e8b60714753bce02e126bd7ce7d6db3a9` passed 20 Rust tests, strict Clippy, formatting/types, WASM/static build and six browser scenarios on both development and static servers. Review fixed four malformed-accessor panic paths. See docs/validation.md for evidence and limitations. Mapping, weights/binds validation, VRM export, joint editing, skin generation and project persistence are not implemented. M1 and M2 remain incomplete.

## Next sequence
1. Foundation [PR #13](https://github.com/postmelee/rigloom/pull/13) was reviewed and merged at `641a074558be67b370d73a201cd5e5be5af6910e`. [PR #14](https://github.com/postmelee/rigloom/pull/14) is retargeted to main and contains the reviewed inspector plus accessor fixes. The owner authorized its merge after final CI; consult the PR for the exact merged state/SHA.
2. After #14 is merged, stop implementation and wait for the owner's new explicit approval before #4 semantic mapping and bind/weight validation. Do not treat this batch's merge approval as authorization to start #4.
3. #5 real VRM serializer and explicit metadata/report; #6 independent loader/viewer round trip and separately arranged local drum-vrm integration.
4. #7 depth-aware placement and #10 project state; resolve #2 algorithm gates before #8 weights and #9 motion quality.
5. #11 corrections/fingers; #12 measured compatibility/performance.

## Restrictions and open uncertainty
No release approval exists. No tag, Release, public hosting deployment or model release inclusion has occurred. No automatic merge. Read docs/release-policy.md before release preparation. Current inspection is not VRM or skin-quality certification. Browser resource budgets and real-model fidelity are unmeasured.

## Current local checkout
Branch `codex/m1-glb-inspection`, with source, npm dependencies and generated WASM available. `npm run dev` starts a localhost-only session; no server is left running by validation. Generated fixtures and local execution logs live under ignored `.local/`. GitHub CI outcome belongs to the PR's exact head; do not infer success from local tests. Browser inspection is an implemented/unreleased #3 slice, not completion of M1 or M2.

## Post-merge handoff (applies once #14 is merged)
The authorized batch is the foundation plus GLB inspection/review fixes only. #1 and #3 can close on integration; #2 research and all M1 conversion/M2 rigging work remain open. M1/M2 are not complete. The next executable task is #4, gated on a new explicit owner approval. There is no approved release/deployment batch. PR/issue comments hold exact merge commits and CI evidence, avoiding a circular self-referencing merge hash in this document.
