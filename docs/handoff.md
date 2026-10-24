# Handoff — 2026-10-25

## State
New public MIT repository: https://github.com/postmelee/rigloom. Local target: /Users/melee/Documents/ChatGPT/rigloom. Independent of drum-vrm; its existing modified files/branch are not part of this task.

M0–M4 milestones and #1–#12 execution issues exist. Initial requirements, bilingual README/guides/release policy, architecture, ADR and research/license gates are prepared. M0 research is not complete: original Pinocchio source/licensing, algorithm experiments and module-level licensing remain open.

The first implementation, #3, was merged through PR #14: Rust GLB inspection → WASM Worker → Three.js static preview and report. Reviewed implementation commit `53e7647e8b60714753bce02e126bd7ce7d6db3a9` passed 20 Rust tests, strict Clippy, formatting/types, WASM/static build and six browser scenarios on both development and static servers. Review fixed four malformed-accessor panic paths. See docs/validation.md for evidence and limitations. Mapping, weights/binds validation, VRM export, joint editing, skin generation and project persistence are not implemented. M1 and M2 remain incomplete.

## Next sequence
1. Foundation [PR #13](https://github.com/postmelee/rigloom/pull/13) was merged at `641a074558be67b370d73a201cd5e5be5af6910e`; inspection [PR #14](https://github.com/postmelee/rigloom/pull/14) at `4e1e11cda89518281c16facf5ecc2a098de6c8d5`. #1 and #3 are closed.
2. #4 semantic mapping and bind/weight validation remains the next product task, but wait for the owner's new explicit approval. The documentation rollback does not authorize starting it.
3. #5 real VRM serializer and explicit metadata/report; #6 independent loader/viewer round trip and separately arranged local drum-vrm integration.
4. #7 depth-aware placement and #10 project state; resolve #2 algorithm gates before #8 weights and #9 motion quality.
5. #11 corrections/fingers; #12 measured compatibility/performance.

## Restrictions and open uncertainty
No release approval exists. No tag, Release, public hosting deployment or model release inclusion has occurred. No automatic merge. Read docs/release-policy.md before release preparation. Current inspection is not VRM or skin-quality certification. Browser resource budgets and real-model fidelity are unmeasured.

## Local development
Use `git status` to confirm the current branch; the handoff does not prescribe a session branch. Source, npm dependencies and generated WASM are available locally. `npm run dev` starts a localhost-only session; no server is left running by validation. Generated fixtures and local execution logs live under ignored `.local/`. GitHub CI outcome belongs to the PR's exact head; do not infer success from local tests. Browser inspection is an implemented/unreleased #3 slice, not completion of M1 or M2.

## Documentation rollback
The owner requested undoing both [PR #17](https://github.com/postmelee/rigloom/pull/17) and [PR #18](https://github.com/postmelee/rigloom/pull/18). [Issue #19](https://github.com/postmelee/rigloom/issues/19) tracks restoration of the prior README/README.ko.md, docs layout and working rules. Hyper Waterfall operating files, specs and mydocs are removed; their history remains in Git. Product source, tests, dependencies and CI are unchanged. The pure inverse commit matches the pre-adoption tree at `4e1e11cda89518281c16facf5ecc2a098de6c8d5`; only current status/authorization notes and the correct LICENSE attribution are refreshed afterward.

Consult #19 and its PR for executed rollback checks, CI, and final merge SHA. #2 research and #4–#12 product work remain open. No new implementation or release/deployment approval exists.
