# 변경을 검증하는 방법

이 문서는 반복 가능한 검사 절차입니다. 특정 커밋의 통과 결과는 [작업 보고](../../mydocs/report/README.md)와 해당 PR 체크에 기록합니다. 명령을 적어 둔 것만으로 검사를 통과한 것은 아닙니다.

먼저 [로컬 개발 환경](local-development.md)을 준비합니다. CI와 맞추려면 저장소의 Rust toolchain, Node 24.15.0과 wasm-pack 0.15.0을 사용합니다.

## 엔진과 빌드

저장소 루트에서 필요한 범위의 검사를 실행합니다. 엔진·WASM·UI 경계가 바뀌면 다음 전체 흐름을 확인합니다.

```sh
cargo fmt --all -- --check
cargo test --workspace --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
npm ci
npm run build
npm run format:check
```

`npm run build`는 release WASM 생성, TypeScript 검사, Vite 정적 빌드를 수행합니다. TypeScript만 빠르게 검사할 때는 `npm run check`를 사용합니다. 현재 `format:check`는 코드·설정 파일을 검사하며 Markdown 문서는 대상이 아닙니다.

## 브라우저 동작

```sh
npx playwright install chromium
npm run test:e2e
RIGLOOM_PREVIEW=1 npm run test:e2e
```

첫 실행은 Vite 개발 서버, 두 번째는 직전에 만든 정적 빌드를 검사합니다. 테스트 설정은 `127.0.0.1:4173` 서버를 직접 관리하므로 같은 포트를 사용하는 서버를 미리 실행하지 않습니다. Linux CI는 브라우저 시스템 의존성을 위해 `npx playwright install --with-deps chromium`을 사용합니다.

검사는 생성형 fixture의 여러 메시·기존 skin, 오류 진단, 취소·교체, 시점·테마·보고서, 잘못된 accessor 이후 복구를 다룹니다. 브라우저 fixture는 테스트 중 메모리에서 생성합니다. `npm run fixtures`로 따로 만든 파일은 `.local/fixtures/`, Playwright 출력은 `test-results/`에 놓이며 둘 다 커밋하지 않습니다. 네트워크 검사에서 관찰한 세션을 넘어 모든 미래 입력·연동에 대한 무업로드 보장을 주장하지 않습니다.

## 결과 남기기

검증한 SHA, 날짜·환경, 명령과 실제 결과, 미실행 범위, 남은 제한을 해당 이슈·PR과 작업 보고에 기록합니다. 문서만 바꿨다면 링크·명령·지원 범위·문서 역할의 일치 여부를 검사하고 불필요한 제품 회귀 검사를 반복하지 않습니다.

기하학 fixture의 성공은 휴머노이드 구조·bind·가중치·VRM 적합성·자연스러운 변형·대표 모델 성능을 입증하지 않습니다. 왕복 변환, 독립 VRM 로더/뷰어, 별도 합의된 drum-vrm 연동, 실제 시간·메모리 측정은 각각 별도의 근거가 필요합니다.
