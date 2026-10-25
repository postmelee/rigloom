# Rigloom

[English](README.md) · [사용자 가이드](docs/guide/ko.md) · [개발 계획](docs/plan.md)

Rust, WebAssembly, Three.js로 만드는 독립적인 브라우저 휴머노이드 준비 도구입니다. 목표 흐름은 **GLB → 검사 또는 관절 배치 → 스키닝 → 동작 확인·보정 → VRM 1.0**입니다.

**상태: 초기 개발 중이며 릴리스·배포하지 않았습니다.** [#5 구현](https://github.com/postmelee/rigloom/issues/5)은 GLB 검사·휴머노이드 매핑·바인드·가중치 검사에 기존 리그의 VRM 1.0 출력을 추가했고 PR #22로 병합되었습니다. 저작자 정보와 모든 이용 조건을 입력하고 원본 자세·권한을 확인한 뒤 VRM과 변환 보고서를 저장합니다. 매핑 선택은 바이트가 같은 원본 GLB용 별도 파일로도 저장할 수 있습니다. 구현한 #6 호환성 검증은 비율이 다른 자체 생성 모델 3종을 three-vrm·독립 Godot VRM 뷰어·고정된 로컬 drum-vrm 복사본에서 확인하며 PR 검토 대기 중입니다. 임의 모델 전체를 인증하지 않습니다. 현재 PR은 Rig 패널의 리그 없는 모델 관절 배치와 원본에 연결된 배치 저장·불러오기를 구현합니다. 가중치 생성과 전체 프로젝트 저장·복원은 별도 작업입니다. 핵심 MVP는 M2의 반자동 리깅이며 M1은 선행 단계입니다.

초기 제품 범위는 자체 포함 glTF 2.0 GLB의 단일 캐릭터이며 여러 메시를 허용합니다. 기존 리그가 있거나 뼈대 없는 T/A 자세 표면 모델을 대상으로 합니다. 현재 검사기 범위는 더 좁습니다. 단일 장면, 조밀한 삼각형 데이터, 내장 BIN·리소스, 기본 glTF 재질을 대상으로 하며 확장과 URI 리소스(data URI 포함)는 지원하지 않습니다. 출력에는 기존 스킨과 +Z 방향의 T 자세, 오른손 Y-up 좌표계, 미터 단위로 준비된 원본이 필요합니다. 이 조건은 사용자가 확인하며 자동 검증·보정하지 않습니다. 출력기는 원본 BIN·스킨·지원하는 PBR 데이터를 보존하고, 제외한 탄젠트 참조를 보고하며, 애니메이션·카메라는 VRM에서 사용하지 않는 데이터로 유지합니다. 검사 통과가 변형 품질이나 모든 VRM 앱의 호환성을 인증하지는 않습니다. [지원 형식·오류 해결 가이드](docs/guide/ko.md)를 확인하세요.

## 로컬 개발

Rust 1.94.1, Node 24.15.0, npm 11.12.1, wasm-pack 0.15.0을 사용합니다. 의존성과 잠금 파일을 고정했습니다. Rust의 wasm32-unknown-unknown 타깃을 먼저 설치하세요.

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.15.0 --locked
npm ci
npm run build
npm run dev
```

Vite가 출력하는 localhost 주소를 엽니다. `npm run fixtures`는 직접 생성한 작은 GLB를 git 제외 경로 `.local/fixtures/`에 만듭니다. 이 모델은 구조 검사 용도이며 휴머노이드 품질을 증명하지 않습니다.

```sh
cargo test --workspace --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo fmt --all -- --check
npm run check
npx playwright install chromium
npm run test:e2e
```

파일은 브라우저 Worker에서 검사하고 로컬에서 표시합니다. 모델 업로드 서비스, 원격 측정, 외부 런타임 CDN을 설정하지 않았습니다. 외부 리소스 URI는 표시 전에 거부하며 브라우저 테스트로 합성 입력의 네트워크 동작을 확인합니다. 향후 모든 통합에 대한 보편적인 개인정보·성능 보장은 아닙니다. 개발 환경 설치 시에는 의존성을 내려받습니다. 출력 테스트는 해시로 고정한 업스트림 스키마도 Git 제외 캐시에 내려받으며, 테스트 전용 스키마·VRM 로더 의존성은 제품 번들에 포함하지 않습니다.

Rigloom은 표준 아바타를 준비하고 [drum-vrm](https://github.com/postmelee/drum-vrm)은 음악에 맞춘 연주를 담당합니다. 캐릭터별 하드코딩이나 drum-vrm 전용 비표준 VRM은 만들지 않습니다.

[마일스톤](https://github.com/postmelee/rigloom/milestones) · [이슈](https://github.com/postmelee/rigloom/issues) · [구조](docs/architecture.md) · [작업 인계](docs/handoff.md) · [라이선스 대장](docs/research/licenses.md) · [릴리스 정책](docs/release-policy.md)

Rigloom 코드는 MIT입니다. 변환은 원본 모델의 권리를 바꾸지 않습니다. 외부 모델 에셋을 포함하지 않았습니다. 릴리스·배포·공개 배포물에 모델 편입은 해당 배치에 대한 소유자의 명시적 승인이 필요하며 PR 자동 병합은 승인되지 않았습니다.
