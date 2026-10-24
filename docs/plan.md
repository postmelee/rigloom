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

First implementation boundary: read-only GLB inspection, one Worker, Three.js static preview and JSON inspection report. No editable-project or VRM export claim. Future engine types should use stable node indices/semantic joints and source revisions, never Three.js object names. Major reorderings require an ADR or issue evidence.

First implementation: #3 was verified and merged through PR #14 (`4e1e11cda89518281c16facf5ecc2a098de6c8d5`); see validation.md and handoff.md. #4–#12 remain implementation/research work, and neither M1 nor M2 is complete.

Owner checkpoint (2026-10-25): restore the documentation and working rules before #17/#18, tracked in #19. Do not begin #4 or later product implementation until the owner gives a new explicit approval. Release/deployment remain unapproved. This takes precedence over the execution sequence above.
