# ADR 0001: Pure Rust inspection and a single Worker

Accepted 2026-10-24.

Use Rust for authoritative model interpretation; wasm-bindgen exposes a versioned JSON inspection result. gltf 1.4.1 is used with default features off and only utils/names enabled: no implicit image/filesystem import. Three.js owns rendering only. Explicit JSON policy checks catch unsupported extensions before a loader could ignore them.

One module Worker provides cancellation by termination and monotonic revisions. Main-thread source read and render parsing are separately acknowledged costs. Do not require SharedArrayBuffer or isolation headers. Revisit only after measured workloads show need.

Preserve input bytes and existing rigs. Do not prematurely export Three.js scenes or bake coordinates. Future source model, rig edit and skin solution boundaries must preserve bind/rest consistency. Sparse accessors, every extension and URI resources are temporarily blocked; this is an implementation limit, not a statement that glTF or eventual Rigloom cannot support them.

Consequences: duplicate source parsing and WASM copies cost memory, but separation is testable without browser objects. Browser/native tests can share generated source geometry. Completion of inspection does not complete mapping, skin validation or VRM export.
