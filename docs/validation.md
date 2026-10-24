# Validation record

Status: first implementation validation is in progress. Never infer a passed check from a planned row. The implementation PR will update executed results and commit references.

| Layer | Scope | State |
|---|---|---|
| Rust | GLB/schema/range/tree/position/policy tests on original synthetic geometry | Pending final run |
| WASM | Build the same engine and execute from a browser Worker | Pending final run |
| Browser | Multi-mesh/rigged load, URI/extension errors, cancellation, views/theme/report, observed no upload requests | Pending final run |
| VRM serialization/round trip | Required humanoid/metadata, weights/binds/materials | Not implemented / not run |
| Independent VRM viewer | Blender add-on/UniVRM and loader comparison | Not run |
| drum-vrm integration | Separate local setup, no existing checkout changes | Not run |
| Skinning quality/performance | Difficult proportions/topology, representative memory/time matrix | Not implemented / not run |

Initial fixtures contain only one or two triangles (3 or 6 source vertices), with an optional one-joint skin. They validate mechanics, not humanoid anatomy, actual conversion fidelity, realistic rendering, safe maximum inputs or natural deformation. No production character models were downloaded.
