# Task #16 최종 보고 — 문서 책임 분리

[이슈 #16](https://github.com/postmelee/rigloom/issues/16) · M0 · 3단계.
[수행계획](../plans/task_m0_16.md) · [구현계획](../plans/task_m0_16_impl.md) · [승인 범위](../feedback/20261025_documentation-approval.md).

이 보고서 본문은 최초 게시 head `6f9980f3fbe657bb045a169d2b1fae7a7bf50ad5`의 기록이다. 후속 병합 검토는 마지막 절에서 구분한다.

## 결과와 영향 범위

README를 사용자 탐색 입구로 줄이고 현재 사용법은 docs, 규범 설계는 specs, 작업·조사·검증 증거는 mydocs로 분리했다. 한영 중복은 한국어 단일 문서로 통합했다. 루트 AGENTS는 공통 운영 규칙과 필요한 기준 링크를 제공하며 디렉터리별 README/AGENTS로 책임을 나눈다.

선행 Hyper Waterfall 도입은 [PR #17](https://github.com/postmelee/rigloom/pull/17) / `478c7a15574efdcfe2b8a92c02189924d21bff37`이다. 이 문서 재편 PR은 publish/task15를 base로 하여 설치 diff를 제외한다. 선행 PR 병합 후 main으로 재지정하여 다시 확인해야 한다. 제품 코드·의존성·CI 동작은 바꾸지 않았다.

## 문서 위치 검증과 이동표

아래 위치는 승인된 수행계획의 독자·확정 수준·수명 판단과 일치한다. 이전 원문은 [재편 전 고정 commit](https://github.com/postmelee/rigloom/tree/478c7a15574efdcfe2b8a92c02189924d21bff37)에서 확인할 수 있다. 기존 경로에 redirect용 문서를 대량 남기지 않았다.

| 이전 경로·내용               | 새 위치                                                                                                      | 결과                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| README.md + README.ko.md     | [README.md](../../README.md)                                                                                 | 한국어 입구로 통합               |
| docs/guide/en.md + ko.md     | [docs](../../docs/README.md)의 네 목적별 디렉터리                                                            | 사용법·사실·설명 분리            |
| docs/product-requirements.md | [요구사항](../../specs/product/requirements.md)                                                              | 수용 기준 보존                   |
| docs/plan.md                 | [로드맵](../../specs/product/roadmap.md)                                                                     | 목표·의존 보존, 가변 상태는 이슈 |
| docs/architecture.md         | [아키텍처](../../specs/architecture/overview.md) + [과거 보고](task_m1_3_report.md)                          | 현재/계획과 PR 사건 분리         |
| docs/decisions/0001-*.md     | [ADR 0001](../../specs/decisions/0001-engine-worker-and-fidelity.md)                                         | 채택 이유·결과 보존              |
| docs/release-policy.md       | [릴리스 정책](../../specs/policies/release.md) + [승인 기록](../feedback/20261025_documentation-approval.md) | 상시 정책과 배치 지시 분리       |
| docs/validation.md           | [검증 방법](../../docs/how-to/verification.md) + [#3 보고](task_m1_3_report.md)                              | 반복 절차와 당시 결과 분리       |
| docs/handoff.md              | [재개 인덱스](../README.md), 날짜 보드, [과거 보고](task_m1_3_report.md)                                     | 전역 누적 종료                   |
| docs/research/*.md           | [표준·알고리즘](../tech/task_m0_2_standards-and-algorithms.md), [라이선스](../tech/task_m0_2_licenses.md)    | 조사 시점·미확정 조건 보존       |
| docs/research/*.json         | mydocs/tech/task_m0_2_*.json                                                                                 | 두 파일 100% 동일 이동           |

새 [문서 정책](../../specs/policies/documentation.md)은 기준 위치·갱신 시점·프레임워크 원문 보호를 정의한다. 법적 고지는 [THIRD_PARTY_NOTICES](../../THIRD_PARTY_NOTICES.md)에 모았다. 기존 조사 문서의 Rigloom 저작권 표기 오류는 LICENSE의 Taegyu Lee로 수정했고 Hyper Waterfall의 postmelee 고지는 구별했다.

## 변경 전·후

| 지표           | 이전                          | 이후                                    |
| -------------- | ----------------------------- | --------------------------------------- |
| 루트 README    | 언어별 40줄 2개               | 한국어 25줄 1개                         |
| 사용자 guide   | 두 언어가 네 목적을 혼합      | 네 목적의 안내와 개별 문서              |
| 상태 재개      | 전역 handoff/plan의 복제 상태 | 날짜 보드→실제 이슈→승인 계획→단계 결과 |
| AGENTS         | 도입 직후 103줄               | 프로젝트 링크 중심 69줄                 |
| 실제 기능/코드 | 검사·정적 미리보기·JSON       | 동일, 기능 변경 없음                    |

## 검증 결과

| 수용 기준          | 결과                                                        |
| ------------------ | ----------------------------------------------------------- |
| 프로젝트 문서 탐색 | 42개 Markdown·190개 내부 링크/anchor 오류 0개               |
| Markdown 형식      | 프로젝트 문서 Prettier 3.9.10 검사 통과                     |
| Mermaid            | 사용자 처리와 구현/계획 다이어그램 2개 parser 통과          |
| framework 보존     | 설치 파일 50개 hash 동일, AGENTS의 placeholder 외 원문 동일 |
| 조사·고지 보존     | JSON 두 개 byte 동일, upstream MIT 전문 보존                |
| 제품 무변경        | src/crates/scripts/tests/설정/lockfile/CI diff 없음         |
| 내용 독립 검토     | 요구사항·권한·지원 범위·검증 근거의 차단 문제 없음          |

[Stage 1](../working/task_m0_16_stage1.md), [Stage 2](../working/task_m0_16_stage2.md), [Stage 3](../working/task_m0_16_stage3.md)에 실행 범위와 당시 결과를 기록했다. 마지막 로컬 검사 명령은 `python3 /private/tmp/rigloom-check-docs.py`, `python3 /private/tmp/rigloom-format-docs.py --check`, `node /private/tmp/rigloom-parse-mermaid.mjs`, `git diff --check`였다. 앞의 세 도구는 작업용 임시 검사이며 제품에 설치하지 않았다.

이 보고서는 PR 게시 전 로컬 검증 기록이다. 이후 정확한 head SHA와 Verify CI 결과는 PR에 남긴다. 로컬 제품 회귀 검사는 문서만 바뀌어 반복 실행하지 않았으며, 과거 #3 검증은 당시 증거로만 이관했다.

## 잔여 위험과 승인 경계

외부의 옛 문서 deep link는 자동 리다이렉트되지 않는다. 프레임워크 템플릿의 예시·upstream 경로는 원문으로 유지한다. 모든 외부 URL의 가용성과 Mermaid 브라우저별 렌더링은 이번 검사 범위 밖이다.

문서 작업과 개별 PR 작성은 승인되었다. PR 병합과 #4 제품 구현, 릴리스 태그·Release·배포는 수행하지 않았으며 별도 지시가 필요하다. 이 보고서는 구현·배포 승인을 새로 부여하지 않는다.

## 후속 병합 검토 — 2026-10-25

[후속 소유자 지시](../feedback/20261025_documentation-approval.md)에 따라 #17을 검토하고 `d88ae4d13ff9817f06f1ed7b9418fcfdcb97d21b`로 병합했다. #18은 main으로 재지정했다. 새 main의 트리는 도입 head `478c7a15574efdcfe2b8a92c02189924d21bff37`과 같아 문서 재편 diff만 남는 것을 확인했다.

이번 검토에서는 AGENTS와 승인 기록·날짜 보드를 후속 지시에 맞췄다. 별도 읽기 검토에서 기능·요구사항·권한·고지·원본 보존의 차단 문제는 발견하지 못했다. 정확한 최종 head의 문서 검사·CI·병합 결과는 [PR #18](https://github.com/postmelee/rigloom/pull/18)에 남긴다. #4 구현·릴리스·배포는 수행하지 않는다.
