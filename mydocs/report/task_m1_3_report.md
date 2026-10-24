# M1 #3: GLB 검사와 미리보기 검증 기록

이 문서는 2026-10-24의 기존 `docs/validation.md`와 `docs/handoff.md`를 문서 재편 시 이관한 과거 기록입니다. 새로운 테스트 실행이나 소급하여 만든 Stage 승인이 아닙니다. 당시 명령·환경·제한을 보존하고 병합 결과는 실제 PR에 연결했습니다.

## 결과와 범위

[이슈 #3](https://github.com/postmelee/rigloom/issues/3)의 Rust GLB 검사 → WASM Worker → Three.js 정적 미리보기·JSON 보고서를 구현했습니다. 검사 완료는 M1 변환 또는 M2 리깅 완료가 아닙니다. 휴머노이드 매핑, bind·가중치 검증, VRM 출력, 관절 편집, 스킨 생성, 프로젝트 저장은 이 작업에 포함하지 않았습니다.

기반 문서 [PR #13](https://github.com/postmelee/rigloom/pull/13)은 `641a074558be67b370d73a201cd5e5be5af6910e`, 구현 [PR #14](https://github.com/postmelee/rigloom/pull/14)는 `4e1e11cda89518281c16facf5ecc2a098de6c8d5`로 순서대로 병합되었습니다. 최종 PR head는 `55417a60f8fa73e2308fea6d1dd8dd48a6d42d0f`이며 [해당 CI](https://github.com/postmelee/rigloom/actions/runs/40076694949)가 통과했습니다. 당시 승인 범위는 이 두 PR의 검토·병합까지였고, #4 시작에는 새 승인이 필요했습니다. 릴리스·배포·모델 공개 편입은 수행하지 않았습니다.

## 초기 구현 검증

실행일: 2026-10-24. 환경: macOS arm64, Rust 1.94.1, Node 24.15.0, npm 11.12.1, wasm-pack 0.15.0, Playwright Chromium 156.0.8078.4, 소프트웨어 WebGL. 검증 구현 커밋: `03aa5e895f2885f919d9c33e45a5a990c055ed47`.

| 검사                                                                  | 당시 결과                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `cargo test --workspace --locked`                                     | 네이티브 통합 검사 16개 통과. 빈 unit/doc suite는 개수에 포함하지 않음 |
| `cargo clippy --workspace --all-targets --locked -- -D warnings`      | 통과                                                                   |
| `cargo fmt --all -- --check`, `npm run check`, `npm run format:check` | 통과                                                                   |
| `npm ci`, `npm run build`                                             | 최종 로컬 경로에서 의존성 재설치 및 release WASM·정적 빌드 통과        |
| `npm run test:e2e`                                                    | 개발 서버에서 5개 통과, 5.1초                                          |
| `RIGLOOM_PREVIEW=1 npm run test:e2e`                                  | 정적 서버에서 5개 통과, 4.3초                                          |
| `git diff --cached --check`                                           | 구현 커밋 전 통과                                                      |

브라우저 검사는 여러 메시·보고서 다운로드, 기존 skin 표시, URI 네트워크 차단, 확장·절단 진단, 지연 Worker 취소·교체, 시점과 테마를 다뤘습니다. 관찰한 합성 입력 세션에서는 교차 출처 HTTP 및 POST/PUT/PATCH 업로드가 없었습니다. 향후 모든 연동의 무업로드 보장은 아닙니다. 생성 형상의 스크린샷으로 레이아웃·뷰포트를 확인했습니다.

개발 중 fixture 배열 구성, Three.js 재질 union 타입, lint, CSP에 막힌 개발 CSS 오류를 수정한 뒤 통과했습니다. Vite inline CSS 허용은 개발 환경에만 적용했고 정적 빌드는 같은 출처 스타일을 유지했습니다. 복사된 실행 링크에 의존하지 않도록 최종 경로에서 `npm ci`를 다시 실행했습니다.

## PR #14 검토와 오류 입력 강화

수정 검증 커밋: `53e7647e8b60714753bce02e126bd7ce7d6db3a9`.

초기 PR에서 accessor count 0, POSITION shape 불일치, 부동소수 인덱스, 범위를 벗어난 POSITION accessor 참조의 네 가지 네이티브 panic을 재현했습니다. 마지막 문제는 gltf-json 1.4.1 검증 hook의 직접 인덱싱에서 발생하고 나머지는 binary reader 전제 위반이었습니다. parser 이전 참조 범위 검사, binary reader 이전 count·POSITION·index 타입/shape/정규화 검사를 추가하여 안정적인 진단으로 반환하게 했습니다.

| 수정 후 검사                               | 당시 결과                              |
| ------------------------------------------ | -------------------------------------- |
| `cargo test --workspace --locked`          | 통합 검사 20개 통과                    |
| 엄격 Clippy                                | 통과                                   |
| `cargo fmt --all`                          | 실행 완료. CI가 별도로 형식 검사       |
| `npm run build`                            | release WASM·TypeScript·정적 빌드 통과 |
| `npm run format:check`, `git diff --check` | 통과                                   |
| `npm run test:e2e`                         | 6개 통과, 5.8초                        |
| `RIGLOOM_PREVIEW=1 npm run test:e2e`       | 6개 통과, 5.2초                        |

추가 브라우저 검사는 네 오류가 보고서로 반환되고 이후 정상 rigged 입력이 다시 표시됨을 확인했습니다. 새로운 의존성·모델 자산·출력·매핑·bind 구현은 추가하지 않았고 기본 fixture 출력도 유지했습니다.

## fixture 출처와 식별

당시 `scripts/fixtures.mjs`에서 직접 생성했으며 바이너리는 무시되는 `.local/fixtures/`에 보관했습니다. 실제 캐릭터를 다운로드하지 않았습니다. surface와 rigged는 정점 3개, rigged는 관절 1개, multi는 메시 2개·원본 정점 6개이며 모두 텍스처가 없습니다. 오류 fixture는 미지원 기능·자원을 의도적으로 선언합니다.

| 파일          | 바이트 | SHA-256                                                            |
| ------------- | -----: | ------------------------------------------------------------------ |
| extension.glb |    504 | `2c91f95531d98a2922d6e828258f0fe4220bc961c0e98d8922480b806ca35686` |
| external.glb  |    504 | `c20d00393002e9d199d77ed75390ee9d637ccf47e8c5b3deca916f0a1b683c69` |
| multi.glb     |    536 | `a727203968cd0ac104063cbc0d51377e1e1074b863b6bfd5920c89baff12330e` |
| rigged.glb    |    840 | `5370ec4d85fb76765a7ef389bab5a18646ca4b71a6631c35dcc147fe07d6743a` |
| surface.glb   |    456 | `8b42fd4833a8422b5f41ba2b89fa14446f31a86e441adbcd175e45b07940c78b` |

## 측정과 미검증 범위

초기 빌드의 관찰값은 main JS 약 644.34 kB(gzip 163.20 kB), WASM 425.28 kB(gzip 143.14 kB), Worker JS 2.76 kB, CSS 4.63 kB입니다. Vite의 500 kB 초과 chunk 경고가 있었고 이 호스트에서는 wasm-pack이 대응 wasm-bindgen CLI를 소스에서 빌드했습니다. 이 수치와 위 suite 시간은 초기 빌드·검사 실행 기록이며 수정 후 새 성능 측정이나 스키닝 벤치마크가 아닙니다.

VRM 직렬화·왕복 변환, 독립 Blender/UniVRM/로더 비교, drum-vrm 연동, 스키닝 품질은 구현·실행하지 않았습니다. 대표 파일 메모리, 텍스처 디코딩 예산, 깊은 트리 한도, 브라우저 지원, 실제 캐릭터의 원형 보존·자연스러운 변형은 미측정입니다. 삼각형 fixture의 성공으로 이를 추론하지 않습니다. 검사 후 로컬 서버는 종료했습니다.

당시 조사에서 Pinocchio 원본 출처·라이선스, 알고리즘 실험, 모듈 수준 라이선스 감사도 미완료였습니다. 후속 실행 상태는 [이슈 #2](https://github.com/postmelee/rigloom/issues/2)와 [#4](https://github.com/postmelee/rigloom/issues/4)를 확인합니다. 지속적인 검사 방법은 [검증 안내](../../docs/how-to/verification.md)에 분리했습니다.
