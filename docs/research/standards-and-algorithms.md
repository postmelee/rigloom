# Standards and algorithm adoption audit

Research snapshot: 2026-10-24. Exact upstream repository revisions and GitHub license *metadata* are in source-snapshot.json. Metadata alone is not a file-level licensing audit. Links below are references, not vendored implementations/assets. #2 remains open.

## Standards and implementation references

| Reference | Decision / gate |
|---|---|
| [VRM 1.0 humanoid reference](https://github.com/vrm-c/vrm-specification/blob/94e82dd346fa6cf0337c4421728640e5252dd38e/specification/VRMC_vrm-1.0/humanoid.md) | #4 uses revision `94e82dd346fa6cf0337c4421728640e5252dd38e` for bone keys and required/unique/parent rules. #5 uses the same revision for VRMC_vrm 1.0, metadata and resource disposition. Schema text is not vendored; no redistribution grant was established. Tests fetch exact URL/SHA256-pinned schemas into an ignored cache; see the license ledger. |
| [glTF 2.0 skin rules](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins) | #4 checks skin hierarchy, inverse binds and all influence sets. Omitted inverse binds are identity; matrix count may exceed joint count. General bind-shape and posed-source interpretation prevent a false identity-only validity rule. Core URI/extension restrictions remain. |
| [gltf 1.4.1](https://docs.rs/gltf/1.4.1/gltf/) / [gltf-json 1.4.1](https://docs.rs/gltf-json/1.4.1/gltf_json/) | Adopt gltf without default import/image features; gltf-json is transitive schema support. Additional binary/policy validation remains ours; parsing does not certify skin quality. |
| [wasm-bindgen](https://wasm-bindgen.github.io/wasm-bindgen/) | Adopt pinned bridge for byte input/string report; single worker initially. No assumption of threading/isolation. |
| [Three.js](https://threejs.org/docs/) | Adopt pinned renderer and core GLTFLoader; no renderer-owned conversion authority. Measure bundle and memory rather than assuming they are small. |
| [three-vrm](https://github.com/pixiv/three-vrm) | Adopt @pixiv/three-vrm 3.5.5 (MIT) only for #5 development verification, with actual browser image decoding and source-index/bind/material assertions. It is independent of the Rust serializer but shares Three.js with the preview; it does not complete #6's second-viewer/integration work. Executed evidence belongs in validation.md. |
| [VRM Add-on for Blender](https://github.com/saturday06/VRM-Addon-for-Blender) | Candidate independent viewer/export reference. No code copied; release/version and environment must be recorded when actually used. |
| [UniVRM](https://github.com/vrm-c/UniVRM) | Candidate independent Unity implementation for cross-check. Not a browser dependency. No local validation executed. |
| [MMD Tools](https://github.com/MMD-Blender/blender_mmd_tools) | Future offline input-preparation route only. GPL license metadata; no code copied or bundled. Model rights remain distinct. |

The #4/#5 references above were checked on 2026-10-25. The glTF registry document identifies revision `8e798b02d254cea97659a333cfcb20875b62bdd4`. The schema manifest pins this revision and the VRM revision above, including their transitive JSON Schema references. Ajv 8.20.0 and ajv-formats 3.0.1 (MIT) are development-only validators. Schema checks complement native semantic/binary checks; they are not complete VRM conformance certification.

The repository snapshot includes recent pushed_at metadata for comparison, not a claim of support quality. No additional reference library is adopted simply because it appears in this list.

## VRM 1.0 export decisions

The pinned [root specification](https://github.com/vrm-c/vrm-specification/blob/94e82dd346fa6cf0337c4421728640e5252dd38e/specification/VRMC_vrm-1.0/README.md) and [metadata rules](https://github.com/vrm-c/vrm-specification/blob/94e82dd346fa6cf0337c4421728640e5252dd38e/specification/VRMC_vrm-1.0/meta.md) require a GLB with VRMC_vrm 1.0, humanoid mapping, a name, authors and the fixed VRM Public License 1.0 URL. The upstream schema does not constrain the exact version/license URL, so the exporter writes those values explicitly. Rigloom requires every usage choice and authority confirmation even though the specification defines restrictive defaults for omitted optional permissions.

The [official model guidance](https://vrm.dev/en/vrm/vrm_features/) requires a T-pose with +Z facing and glTF's right-handed Y-up metric coordinates. VRM 1.0 does not require rebaking all transforms to identity. #5 preserves source transforms/binds and asks the user to confirm preparation; it does not establish those geometric conditions automatically. Humanoid scale components must remain positive.

Core PBR is permitted without MToon. Optional expressions, look-at, first-person, spring-bone and constraint data are not generated. Animations/cameras are defined as unused by VRM, not prohibited source data, so their original references/payload remain and the report explains this limit. Mesh/morph tangent references are omitted per the export guidance, with counts and unchanged BIN bytes; tangent-only morph targets are blocked to preserve target indices. License findings and the distinction between model rights, dependency licenses and schema text are recorded in [the ledger](licenses.md#schema-reference-audit).

## Skinning candidates and initial local experiment

| Method | Why investigate | Failure assumptions / acceptance gate |
|---|---|---|
| Distance to bone segments, blended influences | Small deterministic Rust baseline and rapid feedback | Nearby limbs/torso can steal weights. Test hand near thigh and shoulder/groin separation. Never call nearest-bone output final quality. |
| Surface connectivity/geodesic diffusion | May reduce Euclidean leakage | Separate clothes/eyes/equipment need explicit attachment; open surfaces and mesh topology matter. Compare original fixtures before selection. |
| Heat/volume-based weights | Candidate smooth interior influence | Closedness, holes, thin parts, voxel resolution, solver memory and numerical behavior must be measured. Diagnose unmet assumptions; do not silently repair/drop geometry. |

[libigl tutorial](https://libigl.github.io/tutorial/) is research on geometry/weights, not proof of Rust/WASM feasibility. The upstream repository contains licensing distinctions; GitHub's aggregate metadata is not sufficient for adopting modules or optional solver dependencies. No libigl source copied or linked. A clean implementation derived from a paper still needs its own numerical validation.

[Baran and Popović, Automatic Rigging and Animation of 3D Characters, SIGGRAPH 2007 (MIT record)](https://dspace.mit.edu/entities/publication/02216671-1424-4552-a2d3-74cec29e2062) establishes a research reference for Pinocchio. The author's original source URL could not be accessed by the web tool in this session. Original implementation origin, separate library/demo/solver licenses and dependencies remain unverified. Do not infer rights from a mirror or the paper. No source, training data, weights or demo assets adopted; no modern-browser timing inferred from the paper.

The owner-authorized local test slice now implements the first two as experimental comparison modes; see [initial-skin.md](initial-skin.md). Local generation is available, but the production quality/research gate below remains open. No libigl/Pinocchio implementation was adopted.

## Evidence required before adopting weights

Generate original connected/disconnected meshes and poses covering long arms/short legs, asymmetry, thin/open geometry, hand near thigh, armpits/groin, overlapping clothes, rigid parts and tiny extremities. Record algorithm/configuration, source hash, vertex/texture/bone counts, CPU/browser, elapsed time and peak-memory method. Assert normalized finite nonnegative influences, valid indices, nonempty weights, neutral-pose preservation and reproducibility. Compare simple baseline with a quality method and an existing tool's recorded output before accepting M2.

## #6 viewer adoption

The independent-viewer requirement uses the official Godot VRM editor importer in Godot 4.5.1, not another three-vrm wrapper. Pin and license gates are recorded in [licenses.md](licenses.md#6-independent-compatibility-tools); numerical evidence/reproduction is in [compatibility.md](../compatibility.md). Adoption is limited to local generated-fixture verification, with no runtime dependency or downloaded character inclusion. It does not resolve #2's skinning algorithm gates.
