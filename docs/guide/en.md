# User guide

[한국어](ko.md) · [README](../../README.md)

Status: first inspection implementation, unreleased and not publicly deployed. Build locally using the README. The interface is currently English; this Korean/English documentation pair describes the same behavior.

1. Choose **Open GLB** and select a self-contained glTF 2.0 GLB.
2. Review counts, node relationships and diagnostics. Errors block preview. Warnings describe limits, including unrigged surfaces and static-only animation handling.
3. Use Front, Side or Free view, drag to orbit, scroll to zoom and right-drag to pan. Existing bones are overlaid when available. View buttons change the camera, not the model's orientation or bind pose.
4. Cancel an inspection or select a replacement file. Stale results cannot replace the latest selection.
5. **Save report** downloads JSON about inspection. It is not a saved project or VRM. Toggle the theme with the header button. File and button controls are keyboard focusable; full keyboard 3D manipulation is future work.

## Current supported subset and errors

| Input | Current behavior / action |
|---|---|
| One scene, multiple meshes | Allowed; character count is not automatically determined |
| Dense triangle geometry, embedded BIN, ordinary core PBR | Inspected and sent to the viewer; rendering can still fail |
| Existing skin / no skin | Inventoried / warned; neither is automatically repaired or rigged |
| External or data URI in buffers/images | Blocked; embed buffers in BIN and images in buffer views |
| Any extension, including compression or special materials | Blocked; prepare a core glTF version and retain original |
| Sparse accessors or non-triangle primitives | Blocked; export dense attributes and triangulate |
| Empty accessors, invalid POSITION/index layouts | Blocked with a report; export nonempty FLOAT VEC3 positions and unsigned SCALAR indices without normalization |
| Truncated files, invalid references, cycles or binary ranges | Blocked; repair/re-export in the source tool |
| Input animation | Counted, static preview only; keep source animation |
| FBX, PMX/PMD, BLEND | No direct import; export GLB from a suitable existing tool |

When preparing GLB through Blender or another tool, inspect axes, scale, materials, embedded textures, bones/weights and animation after export. Conversion may lose features. Format-specific add-ons have their own licenses and model rights still apply. Keep original files.

If WASM initialization fails, rebuild with `npm run build` and reload. If WebGL is unavailable, inspection/reporting still work; enable WebGL for preview. A loader error retains the inspection report. No measured maximum file size, vertex/texture/bone budget or broad browser support is promised; large files may exhaust memory. See [validation](../validation.md).

## Planned export and model rights

VRM 1.0 export, humanoid mapping, joint drag, weights, diagnostic motions and project restore are planned. No export action currently exists. The future workflow will require valid bones/binds/weights and explicit name/authors/usage metadata, preserve qualified resources, and report animation/material changes. Unknown rights will not become CC0. PBR will not automatically become MToon; expressions/look-at/physics are separate later work.

No upload service is configured. Runtime resources are same-origin and model URI resources are blocked before loading. Tests cover generated inputs, not every future deployment. Private model files belong in ignored `.local/`, not the repository. Permission to download/test does not grant video use or redistribution.

Public releases/deployments/model release inclusion require exact-batch owner approval. See the [bilingual release policy](../release-policy.md).
