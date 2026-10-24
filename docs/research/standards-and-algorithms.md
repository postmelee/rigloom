# Standards and algorithm adoption audit

Research snapshot: 2026-10-24. Exact upstream repository revisions and GitHub license *metadata* are in source-snapshot.json. Metadata alone is not a file-level licensing audit. Links below are references, not vendored implementations/assets. #2 remains open.

## Standards and implementation references

| Reference | Decision / gate |
|---|---|
| [VRM 1.0 humanoid reference](https://github.com/vrm-c/vrm-specification/blob/94e82dd346fa6cf0337c4421728640e5252dd38e/specification/VRMC_vrm-1.0/humanoid.md) | #4 uses revision `94e82dd346fa6cf0337c4421728640e5252dd38e` to define bone keys and required/unique/parent rules. No schema/code is vendored. #5 still needs full exporter/metadata schema qualification and file-level licensing review before copying schema text. |
| [glTF 2.0 skin rules](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#skins) | #4 checks skin hierarchy, inverse binds and all influence sets. Omitted inverse binds are identity; matrix count may exceed joint count. General bind-shape and posed-source interpretation prevent a false identity-only validity rule. Core URI/extension restrictions remain. |
| [gltf 1.4.1](https://docs.rs/gltf/1.4.1/gltf/) / [gltf-json 1.4.1](https://docs.rs/gltf-json/1.4.1/gltf_json/) | Adopt gltf without default import/image features; gltf-json is transitive schema support. Additional binary/policy validation remains ours; parsing does not certify skin quality. |
| [wasm-bindgen](https://wasm-bindgen.github.io/wasm-bindgen/) | Adopt pinned bridge for byte input/string report; single worker initially. No assumption of threading/isolation. |
| [Three.js](https://threejs.org/docs/) | Adopt pinned renderer and core GLTFLoader; no renderer-owned conversion authority. Measure bundle and memory rather than assuming they are small. |
| [three-vrm](https://github.com/pixiv/three-vrm) | Candidate independent-of-exporter loader for #6, not yet a dependency or executed test. A second viewer must not merely wrap the same loader. |
| [VRM Add-on for Blender](https://github.com/saturday06/VRM-Addon-for-Blender) | Candidate independent viewer/export reference. No code copied; release/version and environment must be recorded when actually used. |
| [UniVRM](https://github.com/vrm-c/UniVRM) | Candidate independent Unity implementation for cross-check. Not a browser dependency. No local validation executed. |
| [MMD Tools](https://github.com/MMD-Blender/blender_mmd_tools) | Future offline input-preparation route only. GPL license metadata; no code copied or bundled. Model rights remain distinct. |

The #4 references above were checked on 2026-10-25. The glTF registry document identifies revision `8e798b02d254cea97659a333cfcb20875b62bdd4`. These are specification references, not newly adopted libraries.

The repository snapshot includes recent pushed_at metadata for comparison, not a claim of support quality. No additional reference library is adopted simply because it appears in this list.

## Skinning candidates (not implemented)

| Method | Why investigate | Failure assumptions / acceptance gate |
|---|---|---|
| Distance to bone segments, blended influences | Small deterministic Rust baseline and rapid feedback | Nearby limbs/torso can steal weights. Test hand near thigh and shoulder/groin separation. Never call nearest-bone output final quality. |
| Surface connectivity/geodesic diffusion | May reduce Euclidean leakage | Separate clothes/eyes/equipment need explicit attachment; open surfaces and mesh topology matter. Compare original fixtures before selection. |
| Heat/volume-based weights | Candidate smooth interior influence | Closedness, holes, thin parts, voxel resolution, solver memory and numerical behavior must be measured. Diagnose unmet assumptions; do not silently repair/drop geometry. |

[libigl tutorial](https://libigl.github.io/tutorial/) is research on geometry/weights, not proof of Rust/WASM feasibility. The upstream repository contains licensing distinctions; GitHub's aggregate metadata is not sufficient for adopting modules or optional solver dependencies. No libigl source copied or linked. A clean implementation derived from a paper still needs its own numerical validation.

[Baran and Popović, Automatic Rigging and Animation of 3D Characters, SIGGRAPH 2007 (MIT record)](https://dspace.mit.edu/entities/publication/02216671-1424-4552-a2d3-74cec29e2062) establishes a research reference for Pinocchio. The author's original source URL could not be accessed by the web tool in this session. Original implementation origin, separate library/demo/solver licenses and dependencies remain unverified. Do not infer rights from a mirror or the paper. No source, training data, weights or demo assets adopted; no modern-browser timing inferred from the paper.

## Evidence required before adopting weights

Generate original connected/disconnected meshes and poses covering long arms/short legs, asymmetry, thin/open geometry, hand near thigh, armpits/groin, overlapping clothes, rigid parts and tiny extremities. Record algorithm/configuration, source hash, vertex/texture/bone counts, CPU/browser, elapsed time and peak-memory method. Assert normalized finite nonnegative influences, valid indices, nonempty weights, neutral-pose preservation and reproducibility. Compare simple baseline with a quality method and an existing tool's recorded output before accepting M2.
