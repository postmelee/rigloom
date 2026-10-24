# Dependency, research and asset ledger

Rigloom source: MIT, copyright 2026 Taegyu Lee (see LICENSE). Pin direct dependency versions in manifests and all resolved code in Cargo.lock/package-lock.json. dependencies.json records the resolved Cargo and installed npm package license declarations; package license text remains authoritative. Optional platform packages are additionally pinned by package-lock.json.

| Direct code/tool | Version | Declared license | Use |
|---|---|---|---|
| gltf / transitive gltf-json | 1.4.1 | MIT OR Apache-2.0 | Native/worker parser and schema types |
| serde | 1.0.229 | MIT OR Apache-2.0 | Report serialization |
| serde_json | 1.0.154 | MIT OR Apache-2.0 | JSON policy and report |
| wasm-bindgen | 0.2.129 | MIT OR Apache-2.0 | WASM glue |
| Three.js | 0.186.1 | MIT | Viewer |
| lucide | 1.61.0 | ISC | Consistent SVG icons |
| @types/three | 0.186.0 | MIT | Type definitions |
| TypeScript | 7.0.2 | Apache-2.0 | Development type checks |
| Vite | 8.3.5 | MIT | Development/build |
| @playwright/test | 1.64.1 | Apache-2.0 | Browser verification |
| Prettier | 3.9.10 | MIT | Development formatting |
| wasm-pack | 0.15.0 | MIT OR Apache-2.0 | Build tool |

See [standards-and-algorithms](standards-and-algorithms.md) and source-snapshot.json for standards/reference tools. Those are researched, not bundled. Unverified source/file/module licenses are adoption gates, not implicitly MIT. Papers, implementation code, datasets, model weights and 3D assets must never share a single assumed license.

## Assets

- scripts/fixtures.mjs and Rust test constructors: original generated triangle geometry under repository MIT. Produced binaries stay in ignored .local/ or test memory. No model file committed or included in a release artifact.
- Icons: selected lucide SVG definitions; retain its ISC notice.
- Fonts: system fonts, no downloaded font asset.
- External character models, motion assets, datasets and learned weights: none acquired or included.
- Private originals/conversations/downloads/credentials: forbidden in commits. `.local/` is ignored.

Before any external-model use, record source/version/hash and separate permission for research, download, local testing, public video and redistribution. A marketplace page or purchase does not establish all rights. Before a release, audit actual shipped code notices, platform bundles and asset inventory and request owner approval for the exact inclusion scope.

CI-only GitHub Actions: actions/checkout v4 pinned to `11d5960a326750d5838078e36cf38b85af677262`, and actions/setup-node v4 pinned to `49933ea5288caeca8642d1e84afbd3f7d6820020`. They are workflow tools, not browser runtime assets.
