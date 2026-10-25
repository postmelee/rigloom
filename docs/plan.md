# Plan and execution order

All milestones are open. M1 is a prerequisite; only M2 establishes the requested core MVP. No public release/deployment exists.

| Milestone | Issues | Exit criteria | Exclusions |
|---|---|---|---|
| [M0](https://github.com/postmelee/rigloom/milestone/1) Research/design | #1 scope and workflow; #2 standards/license/algorithm audit | Requirements, ADRs, license gates, validation matrix, executable issues | Unmeasured quality/performance claims |
| [M1](https://github.com/postmelee/rigloom/milestone/2) Existing-rig conversion | #3 inspect/view; #4 mapping/binds; #5 export; #6 compatibility | Existing-rig GLB → reviewed mapping → VRM 1.0, preserving weights/binds; independent round trip | New skeleton/weights |
| [M2](https://github.com/postmelee/rigloom/milestone/3) Semi-automatic MVP | #7 placement; #8 weights; #9 motion; #10 project | Depth-aware joint editing, validated initial skinning, corrective route, motions, export and restoration | Universal automatic rigging; fingers |
| [M3](https://github.com/postmelee/rigloom/milestone/4) Corrections/fingers | #11 | Fingers on suitable geometry, region/brush/lock/smooth controls and rigid parts | Generating fingers from closed surfaces |
| [M4](https://github.com/postmelee/rigloom/milestone/5) Compatibility | #12 | Varied proportions, hard-mesh diagnostics, measured budgets, format decision evidence | All-model/all-browser guarantees |

Issues are under https://github.com/postmelee/rigloom/issues. Keep implementation PRs small. Do not automatically merge. A research gate may remain open while independent implementation proceeds.

Execution: #1 and initial #2 audit → #3 inspection → #4 semantic mapping and bind/weight validation → #5 serialization → #6 independent compatibility → #7 and #10 editor/project state → #8 algorithm experiments → #9 quality loop → #11 → #12. #2's algorithm and licensing uncertainty must be resolved before adopting research implementations, not assumed solved by inspection work.

Implemented boundary: immutable GLB inspection, one Worker, static preview, semantic mapping, bind/weight checks and source-bound mapping JSON. The #5 implementation adds existing-rig VRM 1.0 serialization, explicit attribution/usage choices and a conversion report while preserving source BIN/skin/PBR data. Source-pose preparation and rights are user-confirmed; no pose rebake or new skinning is implemented. Stable source indices cross the Rust/WASM/UI boundary. Editable projects and joint editing remain future work. Major reorderings require an ADR or issue evidence.

The first implementation, #3, was merged through PR #14 (`4e1e11cda89518281c16facf5ecc2a098de6c8d5`); #4 was reviewed and merged through PR #21. #5 is merged through PR #22 and remains unreleased. Its tests include pinned schema checks and an independent-of-exporter browser loader, while broader compatibility, a second viewer and separately arranged local drum-vrm integration remain #6. Neither M1 nor M2 is complete. Executed checks and tested commits belong in validation.md and issue/PR evidence, not inferred from this plan.

Owner checkpoint (2026-10-25): review and merge #22 if sound, then retarget #24 to main, revalidate and merge if sound. #22 merged at `0043eb880b7950947bdcce4a2f8869e989faeb98`. Keep a local preview available. #6 or later implementation, releases and deployment are not authorized. The documentation rollback is complete through #20; retain the restored structure without reintroducing Hyper Waterfall. This checkpoint takes precedence over the execution sequence above.
