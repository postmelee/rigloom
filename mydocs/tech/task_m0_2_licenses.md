# 의존성·연구·에셋 조사 대장

조사 기준일: **2026-10-24**. 이관일: **2026-10-25**. 기존 `docs/research/licenses.md`의 내용을 책임별 문서 구조에 맞춰 한국어로 이관했다. 당시 의존성·에셋의 조사 기록이며, 이번 이관으로 미확인 라이선스 감사나 향후 배포 검토가 완료된 것은 아니다.

## 배경과 조사 질문

Rigloom에 실제로 사용하는 코드·도구·에셋과 조사만 한 자료를 구분하고, 각 버전과 라이선스 근거 및 남은 도입 조건을 기록한다. 조사 대상은 Cargo/npm 의존성, 빌드·검증 도구, 생성 fixture, 아이콘과 외부 참고 구현이다.

Rigloom의 [루트 LICENSE](../../LICENSE)는 MIT이며 저작권 표기는 **Copyright (c) 2026 Taegyu Lee**다. 기존 조사 문서의 `postmelee` 표기는 루트 LICENSE와 일치하지 않아 이관하면서 바로잡았다. 직접 의존성 버전은 매니페스트, 해결된 코드 버전은 `Cargo.lock`·`package-lock.json`을 기준으로 한다.

## 당시 사용한 코드와 도구

| 코드·도구 | 버전 | 선언된 라이선스 | 용도 |
|---|---|---|---|
| gltf / 간접 의존성 gltf-json | 1.4.1 | MIT OR Apache-2.0 | 네이티브·Worker 파싱과 스키마 타입 |
| serde | 1.0.229 | MIT OR Apache-2.0 | 보고서 직렬화 |
| serde_json | 1.0.154 | MIT OR Apache-2.0 | JSON 정책 검사와 보고서 |
| wasm-bindgen | 0.2.129 | MIT OR Apache-2.0 | WASM 연결 |
| Three.js | 0.186.1 | MIT | 뷰어 |
| lucide | 1.61.0 | ISC | SVG 아이콘 |
| @types/three | 0.186.0 | MIT | 타입 정의 |
| TypeScript | 7.0.2 | Apache-2.0 | 개발 타입 검사 |
| Vite | 8.3.5 | MIT | 개발 서버·빌드 |
| @playwright/test | 1.64.1 | Apache-2.0 | 브라우저 검증 |
| Prettier | 3.9.10 | MIT | 개발 포맷 검사 |
| wasm-pack | 0.15.0 | MIT OR Apache-2.0 | 빌드 도구 |

[의존성 스냅샷](task_m0_2_dependencies.json)은 당시 해결된 Cargo 패키지와 설치된 npm 패키지의 라이선스 **선언**을 기록한다. 실제 패키지 라이선스 본문이 우선하며, 플랫폼별 선택 패키지는 `package-lock.json`에 추가로 고정된다. 이 목록 전체가 브라우저 배포물에 들어간다는 뜻은 아니다.

CI 전용 GitHub Actions는 `actions/checkout` v4 (`11d5960a326750d5838078e36cf38b85af677262`)와 `actions/setup-node` v4 (`49933ea5288caeca8642d1e84afbd3f7d6820020`)로 고정했다. 두 도구는 워크플로 도구이며 브라우저 런타임 에셋이 아니다.

## 에셋 조사 결과

- `scripts/fixtures.mjs`와 Rust 테스트 생성자: 저장소에서 직접 생성한 삼각형 형상이며 저장소 MIT 적용 대상이다. 바이너리는 Git에서 제외되는 `.local/` 또는 테스트 메모리에만 생성한다. 모델 파일을 커밋하거나 릴리스 에셋에 포함하지 않았다.
- 아이콘: 선택한 lucide SVG 정의를 사용하며 ISC 고지를 보존해야 한다.
- 폰트: 시스템 폰트를 사용한다. 내려받은 폰트 에셋은 없다.
- 외부 캐릭터 모델·동작 에셋·데이터셋·학습 가중치: 취득하거나 포함하지 않았다.
- 개인 원본·대화·다운로드·자격 증명: 커밋 대상이 아니다. `.local/`은 Git에서 제외한다.

## 프레임워크 도입과의 구분

2026-10-25 도입하는 Hyper Waterfall v0.3.0은 위의 제품 런타임·연구 라이브러리 목록과 별개의 작업 체계다. 해당 원본 MIT 저작권 표기는 **Copyright (c) 2026 postmelee**이며 Rigloom의 Taegyu Lee 표기를 대체하지 않는다. 도입 버전·locale·원본 근거는 [프레임워크 버전 기록](../../.hyper-waterfall/version.json)을 확인한다. 프레임워크 도입은 아래의 연구·배포 라이선스 조건을 해소하지 않는다.

## 결정, 보류와 적용 영향

[표준·알고리즘 조사](task_m0_2_standards-and-algorithms.md)와 [외부 저장소 스냅샷](task_m0_2_source-snapshot.json)의 참고 도구는 조사 대상이며, 목록에 있다는 이유만으로 코드·에셋을 포함하지 않는다. 검증하지 않은 소스·파일·모듈의 라이선스는 도입 전 확인 조건이다. 논문, 구현 코드, 데이터셋, 학습 가중치, 3D 에셋의 권리를 하나의 라이선스로 추정하지 않는다.

외부 모델을 사용할 때는 출처·버전·해시와 연구·다운로드·로컬 테스트·공개 영상·재배포 권한을 각각 기록해야 한다. 판매 페이지나 구매 사실만으로 모든 이용 권한을 확정하지 않는다. 릴리스 준비 시 실제 포함 코드의 고지, 플랫폼 번들, 에셋 목록을 감사하고 정확한 포함 범위에 대한 소유자 승인을 받아야 한다. 현재 연구 이슈 [#2](https://github.com/postmelee/rigloom/issues/2)의 미해결 조건은 남아 있다.

현재 상시 정책은 [에셋·의존성 정책](../../specs/policies/assets-and-dependencies.md), 배포 고지는 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)를 따른다.
