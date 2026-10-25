# Third-party notices / 제3자 고지

## English
Rigloom is MIT-licensed; dependencies retain their own terms. No external character models, datasets, learned weights, motion clips or downloaded fonts are included. The original MIT procedural standard example is generated into development/local static builds for Open example; other generated models remain local test outputs. No public release assets have been published.

Runtime code uses gltf/gltf-json, serde/serde_json and wasm-bindgen (MIT OR Apache-2.0), and Three.js (MIT). Development dependencies have their own licenses. See the [license ledger](docs/research/licenses.md), resolved inventory and lockfiles for exact versions. This development notice does not certify a future distribution; audit complete shipped license texts and any added assets before requesting release approval.

Independent export tests use @pixiv/three-vrm 3.5.5, Ajv 8.20.0 and ajv-formats 3.0.1 (MIT), with their transitive packages recorded in the inventory. These packages are development dependencies and are not imported by the product. The test schema manifest pins upstream glTF and VRM schema URLs and SHA-256 digests; downloaded schema text remains in the ignored local cache and is not redistributed. See the license ledger for the unresolved upstream schema license evidence.

## 한국어
Rigloom은 MIT이며 의존성에는 각자의 이용 조건이 적용됩니다. 외부 캐릭터 모델·데이터셋·학습 가중치·동작 클립·다운로드 폰트는 포함하지 않았습니다. 자체 제작한 MIT 절차 생성 표준 예제는 Open example을 위해 개발 서버·로컬 정적 빌드에 포함하며, 다른 생성 모델은 로컬 검사 출력입니다. 공개 릴리스 자산을 게시하지 않았습니다.

런타임은 gltf/gltf-json, serde/serde_json, wasm-bindgen(MIT OR Apache-2.0), Three.js(MIT)을 사용합니다. 개발 의존성에는 별도 라이선스가 적용됩니다. 정확한 버전은 [라이선스 대장](docs/research/licenses.md), 해결된 의존성 목록과 잠금 파일을 확인하세요. 이 개발 고지가 향후 배포물을 인증하지는 않으며 릴리스 승인 요청 전에 실제 포함 코드의 전체 라이선스 문구와 추가 자산을 감사해야 합니다.

독립 내보내기 테스트는 @pixiv/three-vrm 3.5.5, Ajv 8.20.0, ajv-formats 3.0.1(MIT)을 사용하며 전이 의존성은 목록에 기록합니다. 모두 개발 의존성이고 제품에서는 가져오지 않습니다. 테스트 스키마 목록은 업스트림 glTF·VRM 스키마 URL과 SHA-256 값을 고정합니다. 다운로드한 스키마 원문은 Git에서 제외된 로컬 캐시에만 보관하며 재배포하지 않습니다. 업스트림 스키마의 미확정 라이선스 근거는 라이선스 대장을 확인하세요.

## Local compatibility verification tools

The #6 test workflow optionally downloads Godot 4.5.1 (MIT engine with separate bundled third-party notices) and Godot VRM 2.0.1 at `9c7436f100d62a8c0c84a1db3fa307be788ad792` (MIT add-on). They remain local test tools and are not included in the Rigloom application. No external character assets are included. Exact pins, source/license links and the isolated drum-vrm integration boundary are in [the license ledger](docs/research/licenses.md#6-independent-compatibility-tools).

#6 로컬 검증은 Godot 4.5.1(MIT 엔진 및 별도 포함 코드 고지)과 Godot VRM 2.0.1의 `9c7436f100d62a8c0c84a1db3fa307be788ad792` 커밋(MIT 애드온)을 선택적으로 내려받습니다. 모두 로컬 검사 도구이며 Rigloom 제품에 포함하지 않습니다. 외부 캐릭터 에셋은 포함하지 않았습니다. 정확한 버전·해시·라이선스 출처와 격리된 drum-vrm 연동 범위는 [라이선스 대장](docs/research/licenses.md#6-independent-compatibility-tools)에 기록합니다.
