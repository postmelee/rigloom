# Architecture

## Implemented first slice
`File.arrayBuffer → revisioned Worker → wasm-bindgen inspect_glb → rigloom-core → versioned Inspection JSON → UI + Three.js GLTFLoader`

- rigloom-core: pure, immutable byte input. Strict GLB framing; gltf 1.4.1 schema/reference checks; explicit policy for extensions/URIs/sparse storage; buffer/accessor range checks; node tree checks; finite positions/topology; mesh/node/skin inventory; structured severity/code/path/message/remedy diagnostics.
- rigloom-wasm: serializes the native report to JSON. No filesystem/network imports. Schema version 1 supports an explicit compatibility boundary.
- Worker: one computation per worker. Transfer ArrayBuffer ownership in and back out. Cancel/replacement terminates the worker (including synchronous WASM) and increments revision. Phases are reading, inspecting and preparing preview; no fabricated percentage.
- UI: static scene and skeleton overlay, orbit/front/side/free views, theme, input/report controls, text-safe diagnostics. Main-thread glTF parsing/rendering is a known responsiveness limitation; heavy future rig/weight work stays in the worker.
- Viewer: generation checks discard old async scene results; old scene resources are disposed. URI guard and same-origin CSP supplement Rust's resource policy. Browser tests monitor actual fixture network behavior.
- Source bytes are not rewritten. No uploader, CDN, analytics, backend, shared memory, exporter or editor exists. Reports are inspection reports, not full conversion certificates.

## Planned M1/M2 boundaries
`SourceDocument` retains source resources, scene/skin identifiers and source hash. `RigDefinition` stores semantic humanoid keys, parent relationships, local rest transforms and bindings. `RigEdit` records user intent in model coordinates. `SkinSolution` stores normalized influences, locked regions, algorithm/configuration and source/rig revision. `ConversionReport` separates validity, changes and deformation concerns.

These are design contracts, not implemented structs. First define them with #4/#7/#10 rather than create unused abstraction layers. Mapping/placement/weights never depend on DOM, mesh names or a character name. Three.js object handles stay in a renderer adapter; stable glTF indices cross the boundary.

Edit commands support undo/redo; a new source/rig revision invalidates derived weights, previews and pending worker responses. Rest pose, node transforms and inverse bind matrices must be evaluated as one coordinate system. Orientation/unit changes must propagate coherently or be rejected.

Project persistence will version source identity, mappings, transforms, placement, weights/settings and corrections. Missing source and schema migration are explicit errors. Export independently validates required VRM metadata/humanoid references and reports animation/material/resource disposition.

## Validation boundaries
Current `preview_allowed` means this inspector permits a static display attempt. It does not assert one human was detected, that skin indices/weights/binds are correct, or that Three.js will render every accepted file. Rendering failures retain the inspection report. Complete matrix layouts, image decoding, deep-tree limits, memory budgets and hostile-input hardening remain #4/#12 concerns.

No arbitrary size cutoff is presented as a product standard. Current File.arrayBuffer/WASM copy/JSON report and renderer allocate memory; representative browser measurements are required before public use. A full retained source is necessary for future fidelity-preserving serialization; do not reconstruct a VRM from the rendered scene alone.
