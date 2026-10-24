# User guide

[한국어](ko.md) · [README](../../README.md)

Status: GLB inspection and #4 mapping/bind validation implementation, unreleased and not publicly deployed. Build locally using the README. The interface is currently English; this Korean/English documentation pair describes the same behavior.

1. Choose **Open GLB** and select a self-contained glTF 2.0 GLB.
2. Review counts, node relationships and diagnostics. Structural or skin-data errors block preview. Mapping errors require correction before future conversion but do not hide an otherwise displayable model. Warnings describe remaining limits.
3. Use Front, Side or Free view, drag to orbit, scroll to zoom and right-drag to pan. Existing bones are overlaid when available. View buttons change the camera, not the model's orientation or bind pose.
4. Cancel an inspection or select a replacement file. Stale results cannot replace the latest selection.
5. In **Humanoid mapping**, review the suggested source nodes. Required bones have an asterisk; expand **Optional bones** for the others. Choose a node or **Unassigned**, then press **Validate mapping**. Ambiguous names require a manual choice. Suggestions use names and general aliases, not anatomical detection.
6. **Save mapping** downloads choices for all 55 supported bones (15 required). Unassigned or invalid choices can be saved after validation to preserve work. **Load mapping** restores choices for the exact same GLB; validate again to apply them. A changed GLB, unsupported schema or malformed mapping is rejected. The file includes a SHA256 source identity and node choices, not model geometry. Keep the original GLB.
7. **Save report** downloads inspection, mapping and bind/weight results. Editing or loading mapping choices disables both save actions until validation completes. Neither JSON download is an editable project or VRM. Toggle the theme with the header button. File and button controls are keyboard focusable; full keyboard 3D manipulation is future work.

## Current supported subset and errors

| Input | Current behavior / action |
|---|---|
| One scene, multiple meshes | Allowed; character count is not automatically determined |
| Dense triangle geometry, embedded BIN, ordinary core PBR | Inspected and sent to the viewer; rendering can still fail |
| Existing skin / no skin | Existing joint references, weights, transforms and inverse binds are checked / no skin to validate; neither is automatically repaired or rigged |
| Missing, duplicate or incorrectly parented humanoid assignments | Correct choices under Humanoid mapping; helper nodes between mapped bones are allowed |
| Invalid weight values, sums, joint indices or skin-accessor layout/alignment | Preview blocked; repair in the source tool; data is not normalized or rewritten automatically |
| More than one JOINTS/WEIGHTS set | All sets are checked, but preview is withheld because the current renderer uses only four influences |
| Singular skinned-mesh world transform | Bind checks may pass, but preview is withheld because the current renderer cannot safely invert that transform |
| Matrix combined with TRS fields, or shear in an explicit local node matrix | Blocked; repair the local transform in the source tool |
| Bind/rest review warning | Inspect the source pose; differing joint-world × inverse-bind products can be intentional and are not automatically treated as corrupt data |
| External or data URI in buffers/images | Blocked; embed buffers in BIN and images in buffer views |
| Any extension, including compression or special materials | Blocked; prepare a core glTF version and retain original |
| Sparse accessors or non-triangle primitives | Blocked; export dense attributes and triangulate |
| Empty accessors, invalid POSITION/index layouts | Blocked with a report; export nonempty FLOAT VEC3 positions and unsigned SCALAR indices without normalization |
| Truncated files, invalid references, cycles or binary ranges | Blocked; repair/re-export in the source tool |
| Input animation | Counted, static preview only; keep source animation |
| FBX, PMX/PMD, BLEND | No direct import; export GLB from a suitable existing tool |

When preparing GLB through Blender or another tool, inspect axes, scale, materials, embedded textures, bones/weights and animation after export. Conversion may lose features. Format-specific add-ons have their own licenses and model rights still apply. Keep original files.

Inverse binds may be omitted (identity is used), and their accessor may contain at least as many matrices as skin joints. Nonidentity transforms and bind-shape transforms are preserved. A successful numerical check does not establish an artist-approved neutral pose or natural deformation. See the [validation boundaries](../architecture.md#mapping-and-existing-skin-contracts).

If WASM initialization fails, rebuild with `npm run build` and reload. If WebGL is unavailable, inspection/reporting still work; enable WebGL for preview. A loader error retains the inspection report. No measured maximum file size, vertex/texture/bone budget or broad browser support is promised; large files may exhaust memory. See [validation](../validation.md).

## Planned export and model rights

VRM 1.0 export, joint drag, weight generation, diagnostic motions and project restore are planned. No model export action currently exists. Mapping includes existing optional finger bones but does not create bones or separate fingers in the geometry. The future workflow will require valid bones/binds/weights and explicit name/authors/usage metadata, preserve qualified resources, and report animation/material changes. Unknown rights will not become CC0. PBR will not automatically become MToon; expressions/look-at/physics are separate later work.

No upload service is configured. Runtime resources are same-origin and model URI resources are blocked before loading. Tests cover generated inputs, not every future deployment. Private model files belong in ignored `.local/`, not the repository. Permission to download/test does not grant video use or redistribution.

Public releases/deployments/model release inclusion require exact-batch owner approval. See the [bilingual release policy](../release-policy.md).
