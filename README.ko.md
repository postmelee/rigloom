# Rigloom

[English](README.md) · [사용자 가이드](docs/guide/ko.md) · [개발 계획](docs/plan.md)

Rust, WebAssembly, Three.js로 만드는 독립적인 브라우저 휴머노이드 준비 도구입니다. 목표 흐름은 **GLB → 검사 또는 관절 배치 → 스키닝 → 동작 확인·보정 → VRM 1.0**입니다.

**상태: 초기 개발 중이며 릴리스·배포하지 않았습니다.** 첫 구현 PR은 읽기 전용 GLB 검사와 3D 미리보기를 제공합니다. 휴머노이드 매핑, 관절 드래그, 자동 가중치, 프로젝트 저장·복원, VRM 출력은 아직 구현하지 않았습니다. 핵심 MVP는 M2의 반자동 리깅이며 M1은 선행 단계입니다.

초기 제품 범위는 자체 포함 glTF 2.0 GLB의 단일 캐릭터이며 여러 메시를 허용합니다. 기존 리그가 있거나 뼈대 없는 T/A 자세 표면 모델을 대상으로 합니다. 현재 검사기 범위는 더 좁습니다. 단일 장면, 조밀한 삼각형 데이터, 내장 BIN·리소스, 기본 glTF 재질을 대상으로 하며 확장과 URI 리소스(data URI 포함)는 지원하지 않습니다. 스킨을 목록화하지만 가중치·바인드의 정확성을 인증하지 않습니다. [지원 형식·오류 해결 가이드](docs/guide/ko.md)를 확인하세요.

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

파일은 브라우저 Worker에서 검사하고 로컬에서 표시합니다. 모델 업로드 서비스, 원격 측정, 외부 런타임 CDN을 설정하지 않았습니다. 외부 리소스 URI는 표시 전에 거부하며 브라우저 테스트로 합성 입력의 네트워크 동작을 확인합니다. 향후 모든 통합에 대한 보편적인 개인정보·성능 보장은 아닙니다. 개발 환경 설치 시에는 의존성을 내려받습니다.

Rigloom은 표준 아바타를 준비하고 [drum-vrm](https://github.com/postmelee/drum-vrm)은 음악에 맞춘 연주를 담당합니다. 캐릭터별 하드코딩이나 drum-vrm 전용 비표준 VRM은 만들지 않습니다.

[마일스톤](https://github.com/postmelee/rigloom/milestones) · [이슈](https://github.com/postmelee/rigloom/issues) · [구조](docs/architecture.md) · [작업 인계](docs/handoff.md) · [라이선스 대장](docs/research/licenses.md) · [릴리스 정책](docs/release-policy.md)

Rigloom 코드는 MIT입니다. 변환은 원본 모델의 권리를 바꾸지 않습니다. 외부 모델 에셋을 포함하지 않았습니다. 릴리스·배포·공개 배포물에 모델 편입은 해당 배치에 대한 소유자의 명시적 승인이 필요하며 PR 자동 병합은 승인되지 않았습니다.
