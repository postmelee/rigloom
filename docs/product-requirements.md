# Product requirements

Status: accepted scope, mostly proposed behavior. Current implementation is tracked in handoff and PRs, not inferred from this specification.

Rigloom is an independent, local-first browser workbench: self-contained GLB → inspect existing rig or place standard humanoid joints → generate/preserve weights → preview and correct deformation → export VRM 1.0, editable project and conversion report. Rust computes; WASM connects; Three.js presents. M2 is the core user experience; arbitrary fully automatic rigging is not promised.

## Inputs and fidelity
- One humanoid character is not one mesh. Inspect body/head/eyes/clothes instances and relationships. Existing rigged and unrigged T/A-pose inputs are both product targets.
- Preserve valid weights, hierarchy, local/world transforms, inverse binds, neutral surface and unusual proportions. File-specific settings are data, never character-name branches.
- Initially accept self-contained glTF 2.0 GLB, triangles, common materials. Define explicit resource/extension policy. Reject unsupported structures with code, location, explanation and remedy; never silently discard data.
- Direct FBX/PMX/PMD/BLEND support is excluded. Preparation through existing tools is documented without claiming lossless conversion.
- Limit decisions require representative file size/vertices/textures/bones, browser/hardware, time and memory evidence. No borrowed drum-vrm limits.

## Joint placement and skinning
- Front/up orientation, floor and size confirmation; pelvis/spine/head/limb joint drag, depth via front/side/free views, mirror toggle, x-ray bones, model translucency, selected-node inspector, optional numeric fields, undo/redo and per-joint/global resets.
- Detect hierarchy/side errors. Separate placement and motion modes. Changing placement explicitly invalidates dependent weights and previews.
- Compare segment-distance initial weights, topology-aware distances/diffusion and volume methods. Nearest-bone assignment alone is not quality acceptance. Inspect assumptions such as closed surfaces before algorithms requiring them.
- Evaluate hand near torso/thigh, armpits/groin, thin/open surfaces, disconnected pieces, overlapping clothing, rigid equipment, tiny hands/feet and asymmetry. Never repair by silently deleting geometry.
- Validate finite/nonnegative normalized weights, valid indices and weighted vertices. M3 adds region assignment, influence adjustment, smoothing, locks, colors and before/after comparison; rigid one-bone attachments are first-class candidates.
- Fingers follow the core rigging flow: position, length and orientation only where geometry can deform separately. No automatic splitting of fist/glove surfaces into fingers.

## Output and quality
- Real VRM 1.0 serialization: required unique humanoid bones, hierarchy/references, coordinate/unit transforms, binds/weights, textures/materials, explicit name/authors/usage metadata and extension/resource checks.
- Keep PBR distinct from MToon. Report visual changes and animation disposition. Auto-generated expressions, gaze, physics and special constraints are follow-up features, never implied support.
- Unknown usage rights block assumptions; never default to CC0. Conversion cannot grant rights.
- Self-generated shoulder, elbow, wrist, knee/squat and ankle motions; fist only with suitable fingers. A valid VRM and natural deformation have separate reports.
- Native Rust, WASM, browser interaction, round trip, independent loader/viewer and local drum-vrm integration form separate validation layers. Screenshots are not conformance proof. Determinism and neutral-surface preservation are acceptance criteria.

## Interaction and data
- Light/dark appearance, readable type, consistent SVG icons, large viewport, progressive controls and contextual inspector, cancellation, actionable errors, keyboard focus/selection.
- No model upload service by default. Verify actual requests, not just WASM use. A single Worker reports phases and revisions; stale results cannot replace new work. SharedArrayBuffer/multithreading requires measured justification.
- Version project settings and source identity; preserve correction data and invalidate stale derived computations. No model redistribution by default.

## Rights and release
Private inputs/downloads/conversation/credentials remain untracked. Research, download, local testing, public video and redistribution have distinct permissions. Franchise examples are not approved assets. Use generated fixtures and motions first. Exact batch approval is required for releases/deployments/model release inclusion; no automatic merge.
