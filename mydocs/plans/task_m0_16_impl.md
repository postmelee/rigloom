# Task #16 구현계획서

수행계획서: [task_m0_16.md](task_m0_16.md) · [이슈 #16](https://github.com/postmelee/rigloom/issues/16) · M0.

## 단계 개요

| Stage | 제목                | 산출물                                  | 검증                                           |
| ----- | ------------------- | --------------------------------------- | ---------------------------------------------- |
| 1     | 독자별 문서 구조    | README, docs, specs                     | 원문·소스와 사실/제한 대조, diff check         |
| 2     | 작업 이력·권한 분리 | mydocs, AGENTS, notices; 기존 경로 제거 | JSON 무손실, 규칙·고지 보존, framework 보호    |
| 3     | 탐색·정합성 검증    | 수정사항, 단계/최종 보고, 이슈·PR       | 링크/anchor, Markdown/Mermaid, 제품 무변경, CI |

## 문서 위치 확인

Stage 1은 수행계획서의 docs/specs, Stage 2는 mydocs와 루트 운영 인덱스를 사용한다. 소스·CI·공개 사이트 경로는 변경하지 않는다. 최종 보고서에는 이전 파일→새 파일 이동표를 남긴다.

## Stage 1 — 사용자와 설계 문서

원본의 두 언어 문서를 대조해 한국어로 통합하고, 실제 동작은 소스의 CLI/UI/보고서와 대조한다. docs에 미래 기능 사용법을 만들지 않는다. specs에서 구현된 부분과 계획 계약을 명시한다.

검증: 문서별 대조와 `git diff --check`.
커밋: `Task #16 Stage 1: 사용자 문서와 설계 기준 분리` (단계 보고서 포함).

## Stage 2 — 이력과 정책 연결

조사 markdown을 한국어로 이관하고 JSON은 byte 보존한다. 검증의 과거 날짜·commit·fixture 해시를 보고서에 보존한다. AGENTS의 프로젝트 규칙은 설계/정책으로 연결해 줄이고 upstream 원문 부분은 유지한다. MIT 전체 고지를 THIRD_PARTY_NOTICES에 옮긴다. 기존 중복 문서 경로를 제거한다.

검증: JSON 비교, framework 설치 원문/해시 확인, `git diff --check`.
커밋: `Task #16 Stage 2: 작업 기록과 정책 연결 정리` (단계 보고서 포함).

## Stage 3 — 전체 검증과 PR

내부 상대 링크와 anchor, Markdown 형식, 두 Mermaid 다이어그램 구문을 확인한다. 필요 수정 후 제품 파일과 CI가 base와 같은지 확인한다. 최종 보고·오늘할일을 갱신해 publish/task16으로 게시한다. #17에 종속된 PR로 diff를 분리하며 CI는 실제 head의 결과를 기록한다.

검증: 문서 링크 검사, `prettier --check`(프로젝트 문서만), Mermaid parser, framework/제품 보존 검사, `git diff --check`, PR 전 clean status 및 GitHub Verify.
커밋: `Task #16 Stage 3 + 최종 보고서: 문서 탐색과 보존 검증`.

## 검증·의존성·위험

검사 전 통과로 적지 않는다. 단계 산출물과 보고서를 같은 커밋에 둔다. 선행 PR 미병합 상태를 완료·배포로 표시하지 않는다. 외부 옛 링크의 직접 호환은 보장하지 않으며 이동표로 복구 경로를 제공한다. 적용한 승인 범위는 수행계획서와 연결된 소유자 지시를 따른다. #4와 릴리스·배포·병합은 제외한다.
