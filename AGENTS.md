# Rigloom working rules

## Resume
Read docs/handoff.md, then product-requirements.md, plan.md and architecture.md; inspect the corresponding GitHub issues/milestones, then applicable ADRs and research adoption gates. Issues govern execution; documents govern design.

## Scope and authority
- Latest owner checkpoint (2026-10-25): review/merge #25 if sound, then continue until the owner can test joint placement and initial weight generation on an unrigged model. #25 merged at ac046acca9e1342b05330542d7b1346a1f38f9f4. Implement #7/#8 and necessary diagnostic-preview/source-bound state support through reviewable PRs. New PR merges, release and deployment are not authorized. Keep drum-vrm unchanged.
- Independent project: postmelee/rigloom, local /Users/melee/Documents/ChatGPT/rigloom. Never modify, resume, switch branches in, or clean the drum-vrm checkout. Read-only references are allowed. Integration must use a separately agreed local validation setup.
- Repository creation, research, planning, local implementation, verification, documents/issues/PRs are authorized. Work in small reviewable PRs on codex/ branches.
- No automatic PR merge. Do not merge without owner direction. No release tags, GitHub Releases, Pages/other hosting deployment, or model inclusion in public release artifacts without explicit owner approval for that batch. Passing CI or merging is not approval. See docs/release-policy.md.
- M2 is the core product experience. M1 completion does not complete the overall request. Distinguish proposed, implemented/unreleased, and deployed behavior.

## Architecture and invariants
- Rust owns interpretation, internal model, semantic hierarchy/mapping, coordinates/rest pose, skin weights, VRM serialization/validation and reports. WASM is a narrow boundary; Three.js/TypeScript own rendering and interaction. Rust remains usable in tests and a future CLI without DOM/Three.js dependencies.
- Start with one Web Worker; cancellation, progress and revision invalidation are required. No mandatory shared memory/multithreaded WASM until measured benefit and deployment requirements are documented.
- Default to local model processing; inspect actual network behavior before claiming no uploads. No telemetry or upload service by default.
- Preserve valid existing skeletons/weights. Keep rest transforms, inverse bind matrices and skin coordinates consistent. No character-specific branching; saved per-file mappings and corrections are data.
- Preserve unusual proportions. File validity and natural motion are separate outcomes. Diagnose unsupported structures; do not silently discard resources, extensions, animation, materials or geometry.
- Initial format: self-contained glTF 2.0 GLB, one character with potentially multiple meshes; rigged or unrigged T/A-pose humanoids. First export target: VRM 1.0, editable project, validation report. FBX/PMX/PMD/BLEND direct import is out of initial scope.
- Joint placement supports depth, front/side views, symmetry toggle, x-ray/translucency, selection, undo/redo and resets. Joint edits invalidate dependent weights. Editing and preview modes remain distinct.
- Skeleton generation and skinning are separate. Nearest-bone assignment is not final quality. Validate finite, nonnegative, normalized weights, indices and unweighted vertices. Test nearby body parts, holes, separate meshes/clothes, rigid parts and asymmetry. Check closed-surface/volume assumptions explicitly.
- Fingers are later work; never promise five deformable fingers from fist/glove geometry. PBR is not automatically MToon. Expressions, look-at and physics are separate features. Unknown model rights must not become CC0/default free use.

## Language, assets and dependencies
- Communicate with owner in Korean. README.md is English, README.ko.md Korean. User guides, format/error/export/release instructions must have equivalent linked English/Korean versions in the same PR. Internal engineering records may be English.
- Pin introduced dependency versions/commits and licenses; keep locks, research/asset ledger and notices current. Separate papers, code, datasets, weights and assets. Do not copy GPL/other incompatible code into MIT without review. C++ does not imply Rust/WASM feasibility.
- Prefer original generated fixtures and motions. Never commit private models, original conversations, credentials, external downloads or personal .local/ material. Research, download, local testing, video use and redistribution require separate rights checks. Named franchise characters are interests, not approved assets.
- UI prioritizes clear tools, light/dark modes, one SVG icon library, a large model area, contextual settings, cancellable operations, actionable errors and keyboard access.

## Finish
Update affected design/ADR/research/user docs. Record PR/commit, actually executed checks and limitations in issues. Update handoff with done/current/next/blockers. Record deployment URL and SHA only when actually deployed. Do not report unrun checks as passed; screenshots alone do not establish skinning or VRM correctness. Measure limits from recorded files/browser/hardware rather than borrowing drum-vrm limits.
