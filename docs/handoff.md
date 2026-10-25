# Handoff — 2026-10-25

## State
Public MIT repository: https://github.com/postmelee/rigloom. Local target: /Users/melee/Documents/ChatGPT/rigloom. Independent of drum-vrm; do not modify or clean its checkout.

M0–M4 milestones and #1–#12 execution issues exist. Initial requirements, bilingual README/guides/release policy, architecture, ADR and research/license gates are prepared. M0 research is not complete: original Pinocchio source/licensing, algorithm experiments and module-level licensing remain open. M1 and M2 remain incomplete.

Foundation [PR #13](https://github.com/postmelee/rigloom/pull/13) merged at `641a074558be67b370d73a201cd5e5be5af6910e`. GLB inspection [PR #14](https://github.com/postmelee/rigloom/pull/14) merged at `4e1e11cda89518281c16facf5ecc2a098de6c8d5`: Rust inspection → WASM Worker → Three.js static preview/report. #1 and #3 are closed.

Mapping/bind [PR #21](https://github.com/postmelee/rigloom/pull/21) merged at `2f9ba270c28c904f0bb7fde8fd772681559ec09c`; #4 is closed. It adds semantic mapping suggestions/overrides, required/unique/hierarchy checks, existing transforms/inverse binds/influences validation, and mapping JSON save/load bound to the source SHA256. Review fixed accessor alignment before merge. Final CI passed; executed local checks and limitations are in validation.md. Inspection schema is 2; mapping-file schema is 1.

The owner subsequently approved [#5](https://github.com/postmelee/rigloom/issues/5) implementation through its issue and PR, with a local server/request for browser interaction if manual input is needed. Current work is VRM 1.0 serialization, explicit metadata/usage permissions, source pose/rights confirmations and conversion report downloads. It preserves source BIN bytes, indices, transforms, skins, embedded PBR resources and non-tangent morph data. VRM tangent references are omitted and reported; tangent-only morph targets are blocked. Original glTF animations/cameras remain in the file and are reported as unused by VRM runtimes. No skin generation, MToon conversion, expression/look-at/physics generation or pose rebaking is included. See architecture.md for contracts and docs/validation.md for executed evidence; issue #5 and its PR record the exact head and CI result. PR #22 was reviewed and merged at `0043eb880b7950947bdcce4a2f8869e989faeb98`; #5 is closed. Implementation remains unreleased.

## Current UI review

The owner requested #23: simplify the interface using drum-vrm as a read-only reference and run a local preview. The UI branch `codex/simple-workspace` was retargeted from the export branch to main after PR #22 merged. The owner authorized reviewing and merging #24 after revalidation. It replaces the decorative three-column layout with a compact toolbar, large viewport and one Model/Mapping/Export panel, native-like controls, and matching light/dark UI and canvas. Theme choice persists; Escape closes a panel. Source validation and export semantics are unchanged. [PR #24](https://github.com/postmelee/rigloom/pull/24) records the UI review, revalidation and final merge state. The localhost preview is started on port 5173 for this review; it is not public deployment and its process availability must be checked in later sessions.

## Next sequence
1. Finish the authorized #24 review/merge using its recorded main-based checks; consult the PR for final merge state. Keep localhost port 5173 available for owner testing. No further product implementation is authorized.
2. After a new owner instruction, #6 adds broader independent viewer/round-trip checks and separately arranged local drum-vrm integration. The generated schema/loader regression in #5 does not complete #6 or qualify real-character motion.
3. #7 depth-aware placement and #10 project state; resolve #2 algorithm gates before #8 weights and #9 motion quality.
4. #11 corrections/fingers; #12 measured compatibility/performance.

## Restrictions and open uncertainty
No release approval exists. No tag, Release, public hosting deployment or model release inclusion has occurred. No automatic merge. Read docs/release-policy.md before release preparation. #6 or later implementation needs a new owner instruction. File/schema/numeric checks do not certify T-pose, rights, artist intent or natural deformation. User exports are not exhaustively schema-certified or independently loaded at runtime. Browser resource budgets and real-model fidelity are unmeasured.

## Local development
Use `git status` to confirm the current branch. Source, npm dependencies and generated WASM are available locally. `npm run dev` starts a localhost-only session; automated validation stops its own servers. Generated fixtures, cached pinned schemas and local execution logs live under ignored `.local/`. The dev-only schema/loader checks need the immutable schema URLs on a cold cache; no schema source or downloaded model is committed. There is no mandatory manual browser operation for the generated regression fixtures. Mapping files preserve choices only; they are not editable projects. M1/M2 remain incomplete.

## Documentation rollback
The owner requested undoing both [PR #17](https://github.com/postmelee/rigloom/pull/17) and [PR #18](https://github.com/postmelee/rigloom/pull/18). [Issue #19](https://github.com/postmelee/rigloom/issues/19) / [PR #20](https://github.com/postmelee/rigloom/pull/20) restored the previous README/README.ko.md, docs layout and working rules. Hyper Waterfall files/specs/mydocs were removed; history remains in Git. The rollback changed no product source, tests, dependencies or CI and merged as `fa2229800d23462f9a8eca57a06565b836381a5b`; #19 is closed. Later approvals enabled #4 implementation/reviewed merge and #5 implementation, followed by reviewed merges of #22 and #24. Release/deployment still need explicit batch approval.
