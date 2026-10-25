# Dependency, research and asset ledger

Rigloom source: MIT, copyright 2026 Taegyu Lee (see LICENSE). Pin direct dependency versions in manifests and all resolved code in Cargo.lock/package-lock.json. dependencies.json records the resolved Cargo and installed npm package license declarations; package license text remains authoritative. Optional platform packages are additionally pinned by package-lock.json.

| Direct code/tool | Version | Declared license | Use |
|---|---|---|---|
| gltf / transitive gltf-json | 1.4.1 | MIT OR Apache-2.0 | Native/worker parser and schema types |
| serde | 1.0.229 | MIT OR Apache-2.0 | Report serialization |
| serde_json | 1.0.154 | MIT OR Apache-2.0 | JSON policy and report |
| wasm-bindgen | 0.2.129 | MIT OR Apache-2.0 | WASM glue |
| Three.js | 0.186.1 | MIT | Viewer |
| @types/three | 0.186.0 | MIT | Type definitions |
| TypeScript | 7.0.2 | Apache-2.0 | Development type checks |
| Vite | 8.3.5 | MIT | Development/build |
| @playwright/test | 1.64.1 | Apache-2.0 | Browser verification |
| @pixiv/three-vrm | 3.5.5 | MIT | Development-only loader independent of the Rust exporter |
| ajv | 8.20.0 | MIT | Development-only glTF/VRM JSON Schema validation |
| ajv-formats | 3.0.1 | MIT | Development-only schema format checks |
| Prettier | 3.9.10 | MIT | Development formatting |
| wasm-pack | 0.15.0 | MIT OR Apache-2.0 | Build tool |

See [standards-and-algorithms](standards-and-algorithms.md) and source-snapshot.json for standards/reference tools. Specification sources and candidate tools remain references unless explicitly adopted above. Unverified source/file/module licenses are adoption gates, not implicitly MIT. Papers, implementation code, datasets, model weights and 3D assets must never share a single assumed license.

## Schema reference audit

#5 pins the validation manifest at [tests/schemas/manifest.json](../../tests/schemas/manifest.json) to VRM specification `94e82dd346fa6cf0337c4421728640e5252dd38e` and glTF specification `8e798b02d254cea97659a333cfcb20875b62bdd4`, with an exact URL and SHA256 for every schema dependency. The verifier downloads original bytes to ignored `.local/schema-cache` and checks their digest on every use. Schema text is not committed, redistributed or included in the product bundle. A cold verification run needs network access to these pinned sources; an absent/mismatched source fails validation.

The VRM revision's [complete tree](https://api.github.com/repos/vrm-c/vrm-specification/git/trees/94e82dd346fa6cf0337c4421728640e5252dd38e?recursive=1), root README and inspected schemas contain no identifiable license/notice granting schema redistribution. GitHub license metadata is null, which is corroborating metadata, not a legal conclusion. No redistribution grant was established; do not label this text MIT or vendor it without resolving that gate. VRM Public License 1.0 defines exported-model usage settings; it is not a license grant for the specification/schema source.

At the glTF revision, [COPYING.adoc](https://github.com/KhronosGroup/glTF/blob/8e798b02d254cea97659a333cfcb20875b62bdd4/COPYING.adoc) describes glTF 2.0 schemas as CC-BY-4.0, while [.reuse/dep5](https://github.com/KhronosGroup/glTF/blob/8e798b02d254cea97659a333cfcb20875b62bdd4/.reuse/dep5) assigns `specification/2.0/schema/*` to `LicenseRef-KhronosSpecCopyright`. Preserve this conflicting evidence rather than asserting a resolved file license; the same no-vendoring test-cache policy applies.

The installed three-vrm, Ajv and ajv-formats packages declare MIT and include their own license text. Their pinned transitive code remains subject to its own notices in the resolved inventory/lockfile. These development dependencies do not authorize redistribution of schema text, character assets or user inputs. This audit records adoption boundaries, not evidence that an export test has run.

## Assets

- scripts/fixtures.mjs, scripts/rig-fixture.mjs, scripts/export-fixture.mjs and Rust test constructors: original generated geometry, humanoid transforms/skins, morphs, motion samples and PNG pixels under repository MIT. The export PNG is encoded from an authored RGBA pixel, not a downloaded image. Produced binaries stay in ignored .local/ or test memory. No model file is committed or included in a release artifact.
- UI controls use text/native HTML. The unused lucide dependency was removed in #23.
- Fonts: system fonts, no downloaded font asset.
- External character models, motion assets, datasets and learned weights: none acquired or included.
- Private originals/conversations/downloads/credentials: forbidden in commits. `.local/` is ignored.

Before any external-model use, record source/version/hash and separate permission for research, download, local testing, public video and redistribution. A marketplace page or purchase does not establish all rights. Before a release, audit actual shipped code notices, platform bundles and asset inventory and request owner approval for the exact inclusion scope.

CI-only GitHub Actions: actions/checkout v4 pinned to `11d5960a326750d5838078e36cf38b85af677262`, and actions/setup-node v4 pinned to `49933ea5288caeca8642d1e84afbd3f7d6820020`. They are workflow tools, not browser runtime assets.
