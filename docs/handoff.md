# Handoff — 2026-10-25

## State
New public MIT repository: https://github.com/postmelee/rigloom. Local target: /Users/melee/Documents/ChatGPT/rigloom. Independent of drum-vrm; its existing modified files/branch are not part of this task.

M0–M4 milestones and #1–#12 execution issues exist. Initial requirements, bilingual README/guides/release policy, architecture, ADR and research/license gates are prepared. M0 research is not complete: original Pinocchio source/licensing, algorithm experiments and module-level licensing remain open.

The first implementation, #3, was merged through PR #14: Rust GLB inspection → WASM Worker → Three.js static preview and report. Reviewed implementation commit `53e7647e8b60714753bce02e126bd7ce7d6db3a9` passed 20 Rust tests, strict Clippy, formatting/types, WASM/static build and six browser scenarios on both development and static servers. Review fixed four malformed-accessor panic paths. See docs/validation.md for evidence and limitations. That #3 milestone did not include mapping or bind/weight validation. VRM export, joint editing, skin generation and project persistence remain unimplemented. M1 and M2 remain incomplete.

Current work is [#4](https://github.com/postmelee/rigloom/issues/4), newly authorized by the owner on 2026-10-25. The implementation adds Rust semantic mapping suggestions/overrides, required/unique/hierarchy checks, existing transforms/inverse binds/influences validation, and browser mapping JSON save/load bound to the exact source SHA256. Source GLB bytes remain unchanged. Inspection schema is now 2; mapping-file schema is 1. See architecture.md for contracts and limits. Executed checks and tested commit belong in validation.md and the #4 issue/PR; do not infer CI or merge from implementation status.

## Next sequence
1. Foundation [PR #13](https://github.com/postmelee/rigloom/pull/13) was merged at `641a074558be67b370d73a201cd5e5be5af6910e`; inspection [PR #14](https://github.com/postmelee/rigloom/pull/14) at `4e1e11cda89518281c16facf5ecc2a098de6c8d5`. #1 and #3 are closed.
2. Review the #4 implementation PR and its exact-head CI. Local verification is recorded in validation.md; the issue links the PR. The owner approved this issue/PR implementation; PR merge and later implementation still need owner direction.
3. #5 real VRM serializer and explicit metadata/report; #6 independent loader/viewer round trip and separately arranged local drum-vrm integration.
4. #7 depth-aware placement and #10 project state; resolve #2 algorithm gates before #8 weights and #9 motion quality.
5. #11 corrections/fingers; #12 measured compatibility/performance.

## Restrictions and open uncertainty
No release approval exists. No tag, Release, public hosting deployment or model release inclusion has occurred. No automatic merge. Read docs/release-policy.md before release preparation. Current inspection is not VRM or skin-quality certification. Browser resource budgets and real-model fidelity are unmeasured.

## Local development
Use `git status` to confirm the current branch; the handoff does not prescribe a session branch. Source, npm dependencies and generated WASM are available locally. `npm run dev` starts a localhost-only session; no server is left running by validation. Generated fixtures and local execution logs live under ignored `.local/`. GitHub CI outcome belongs to the PR's exact head; do not infer success from local tests. Inspection and the current #4 mapping/bind checks are implemented/unreleased slices, not completion of M1 or M2. Mapping files preserve choices only; they are not editable projects or converted models.

## Documentation rollback
The owner requested undoing both [PR #17](https://github.com/postmelee/rigloom/pull/17) and [PR #18](https://github.com/postmelee/rigloom/pull/18). [Issue #19](https://github.com/postmelee/rigloom/issues/19) tracks restoration of the prior README/README.ko.md, docs layout and working rules. Hyper Waterfall operating files, specs and mydocs are removed; their history remains in Git. The rollback changed no product source, tests, dependencies or CI. The pure inverse commit matches the pre-adoption tree at `4e1e11cda89518281c16facf5ecc2a098de6c8d5`; only current status/authorization notes and the correct LICENSE attribution are refreshed afterward.

Rollback [PR #20](https://github.com/postmelee/rigloom/pull/20) merged as `fa2229800d23462f9a8eca57a06565b836381a5b`; #19 is closed. Its PR/issue retain the executed checks. The subsequent owner instruction authorizes #4 implementation only. #2 research and #4–#12 product issues remain open; no release/deployment approval exists.
