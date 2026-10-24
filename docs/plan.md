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

Implemented boundary: immutable GLB inspection, one Worker and Three.js static preview; the current #4 change adds semantic mapping review, existing bind/weight checks and source-bound mapping JSON. Stable source node indices cross the Rust/WASM/UI boundary. No editable-project, new-skinning or VRM export claim. Major reorderings require an ADR or issue evidence.

The first implementation, #3, was verified and merged through PR #14 (`4e1e11cda89518281c16facf5ecc2a098de6c8d5`). #4 is the current implementation/review task; its issue and PR record executed checks and remaining limits. #5–#12 remain implementation/research work, and neither M1 nor M2 is complete. See validation.md and handoff.md.

Owner checkpoint (2026-10-25): review PR #21 for #4, fix/revalidate any findings and merge if sound. After this PR, wait for owner direction before #5 or later implementation. Future merges, releases and deployment remain unapproved. The earlier documentation rollback is complete through #20; retain the restored documentation structure. This checkpoint takes precedence over the execution sequence above.
