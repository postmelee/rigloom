# Task #16 수행계획서 — 문서 책임 분리

GitHub Issue: [#16](https://github.com/postmelee/rigloom/issues/16) · 마일스톤: M0.
선행: [#15 / PR #17](https://github.com/postmelee/rigloom/pull/17).

## 목적

README에서 사용자가 필요한 문서로 바로 이동하고, 현재 사용법·장기 설계·시간에 따른 작업 기록이 서로 다른 수명과 책임을 갖도록 한다.

## 배경

기존 README와 guide는 사용법·목표·검증 기록·운영 지시를 함께 담고 있었다. handoff와 plan에는 병합 전후 조건이 남아 최신 GitHub 상태와 달라질 수 있었다. 소유자는 Hyper Waterfall과 Diátaxis 기반 구조를 승인했다. 프레임워크 설치는 별도 #15에서 완료했으며 이 작업은 프로젝트 문서를 다룬다.

## 범위

### 포함

- 한국어 단일 README와 목적별 docs, 규범 설계 specs, 작업 이력 mydocs.
- 기존 영문/한글 내용을 비교·통합하고 중복 파일을 제거한다. 원문은 Git 이력에 남긴다.
- 디렉터리별 README, docs/specs 범위별 AGENTS, 현재와 계획을 구별하는 Mermaid.
- 반복 검증 방법과 과거 commit별 결과 분리, 조사/라이선스 근거 이동, 링크 점검.

### 제외

제품 코드·의존성·CI 동작 변경, #4 구현, 새 문서 웹사이트, PR 병합, 릴리스·배포.

## 설계 방향

docs는 실제 사용 가능한 기능의 학습/문제 해결/참조/설명만 담는다. specs는 요구사항·수용 기준·아키텍처·ADR·상시 정책의 기준이다. mydocs는 Hyper Waterfall의 고정 폴더 역할을 유지한다. 루트 README는 탐색 입구이고 전역 handoff는 더 이상 누적하지 않는다.

새 기능 자리를 채우기 위한 빈 문서는 만들지 않는다. 프레임워크 설치 원문은 수정하지 않고 AGENTS의 프로젝트 구역만 새 인덱스로 연결한다. 법적 원문과 기계 판독 스냅샷은 번역하지 않는다.

## 문서 위치 판단

| 기존 파일/내용 | 분류·독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|
| README.md / README.ko.md | 공식 입구·사용자 | README.md | docs/README.md만 사용 | 저장소 첫 화면에서 시작점 제공 |
| guide/en.md, ko.md | 공식 사용법·사용자/기여자 | docs/{tutorials,how-to,reference,explanation}/ | 단일 guide | Diátaxis의 사용자 목적 분리 |
| product-requirements.md, plan의 목표·종료 조건 | 규범 설계·구현자 | specs/product/ | docs/explanation/ | 계획과 현재 사용법 혼동 방지 |
| architecture.md, decisions/ | 채택된 설계·구현자 | specs/architecture/, specs/decisions/ | mydocs/tech/ | 채택된 기준과 조사 가설 분리 |
| release-policy, 자산 원칙 | 상시 정책·기여자 | specs/policies/ | mydocs/manual/ | 프레임워크 절차와 프로젝트 정책 분리 |
| validation의 재현 명령 | 공식 기여 안내 | docs/how-to/verification.md | report/ | 반복 가능한 목표 중심 절차 |
| validation/handoff의 실행 증거 | 과거 작업 보고 | mydocs/report/task_m1_3_report.md | 전역 handoff | commit별 근거 보존, 최신 상태 중복 제거 |
| research/* | 조사 근거·내부 작업자 | mydocs/tech/task_m0_2_* | specs/reference/ | 미확정 채택·라이선스 판단 보존 |
| 승인 범위·이번 계획/결과 | 작업 기억·내부 작업자 | mydocs/feedback, plans, working, report, orders | 루트 README | 일시적 기록의 수명 분리 |

## 예상 변경 파일

신규: docs/specs의 역할별 안내와 문서, mydocs 프로젝트 인덱스·이번 task 산출물·조사 이관본.
수정: README.md, AGENTS.md 프로젝트 구역, THIRD_PARTY_NOTICES.md.
제거: README.ko.md 및 위에서 역할별로 옮긴 기존 docs 파일. 재작성 위치와 이전 경로는 최종 보고서에 남긴다.

## 잠정 단계

1. Stage 1: 사용자 docs와 README, 설계 specs를 만들고 내용을 대조한다.
2. Stage 2: 조사/검증/승인 기록과 정책 연결을 정리하고 기존 중복 경로를 제거한다.
3. Stage 3: 링크·역할·원본 보존·제품 무변경을 검증하고 결과를 보고한 뒤 PR을 연다.

## 검증 계획

- 각 단계 `git diff --check`, 변경 파일 목록/내용 검토.
- 문서 상대 링크와 anchor, Markdown 형식·Mermaid parse를 확인한다.
- 원본 snapshot JSON byte 비교, framework 파일 hash 비교(승인된 AGENTS 프로젝트 구역만 예외).
- base 대비 src/crates/scripts/tests/lockfile/CI 동작 차이 없음 확인.
- PR 생성 후 해당 head의 기존 Verify CI를 확인한다. 과거 실행 결과를 이번 검사로 주장하지 않는다.

## 리스크

외부에서 기존 문서 경로로 직접 연결한 링크는 이동 후 깨질 수 있다. 모든 저장소 내부 링크를 갱신하고 최종 보고서에 이동표와 고정된 이전 commit을 남긴다. 빈 redirect 문서를 대량 유지하지 않는다. 설치 원문의 framework 저장소 경로는 제품 문서 링크로 오인하지 않는다.

## 승인 근거와 작업 경계

[2026-10-25 승인 요약](../feedback/20261025_documentation-approval.md)의 설계를 실행계획으로 기록했다. 이미 승인된 문서 작업·검증·PR 작성은 진행하며, 새로운 기능·병합·릴리스 승인은 추정하지 않는다. 독립 diff를 위해 local/task16은 local/task15에서 시작하고 publish/task16의 첫 PR base는 publish/task15로 둔다. #17 병합 지시가 내려져 실제 병합되면 main으로 재지정하고 다시 검증한다. 기존 branch 정책은 유지하며 이번 의존 PR 관계만 명시한다.
