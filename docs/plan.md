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

Implemented boundary: immutable GLB inspection, one Worker, static preview, semantic mapping, bind/weight checks and source-bound mapping JSON. The #5 implementation adds existing-rig VRM 1.0 serialization, explicit attribution/usage choices and a conversion report while preserving source BIN/skin/PBR data. Source-pose preparation and rights are user-confirmed; no pose rebake is implemented. Stable source indices cross the Rust/WASM/UI boundary. Joint editing and experimental initial skinning are implemented local M2 work; full editable projects and corrections remain future work. Major reorderings require an ADR or issue evidence.

The first implementation, #3, was merged through PR #14 (`4e1e11cda89518281c16facf5ecc2a098de6c8d5`); #4 was reviewed and merged through PR #21. #5 is merged through PR #22 and remains unreleased. Its tests include pinned schema checks and an independent-of-exporter browser loader, while #6 adds an independent Godot viewer and pinned local drum-vrm integration on generated fixtures. Broad real-model coverage remains future work. PR #25 is merged and #6 is closed; M1 issue work is complete within its generated-fixture limits, while M2 remains incomplete. Executed checks and tested commits belong in validation.md and issue/PR evidence, not inferred from this plan.

Historical checkpoint (2026-10-25): review/merge #25 if sound, then continue until unrigged placement and initial weights are locally testable. PR #25 merged after review. PR #26 contains placement; `codex/m2-initial-skin` stacks initial generation, basic elbow/knee preview and placement/settings persistence on it. #2 and full #8 quality gates remain open; #9/#10 receive only the support necessary for this local test slice. New PR merges, releases and deployment are not authorized. Keep drum-vrm unchanged. The documentation rollback remains in force; do not reintroduce Hyper Waterfall.


Current checkpoint (2026-10-25): the owner authorized ordered review/merge of #26, #27, #29 and #31, with main retargeting and revalidation between PRs. #26/#27/#29 are merged; #31 records the final review, CI and merge result for this batch. #7 is complete. #8 remains open for representative quality/algorithm/performance evidence; #2 and full #9/#10 are also incomplete. This batch does not authorize subsequent implementation, release or deployment.
