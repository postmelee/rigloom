# AGENTS.md

본 저장소에서 작업하는 모든 코딩 에이전트(Codex, Claude Code 등)가 따르는 운영 규칙. 매 턴 시스템 프롬프트로 적재되므로 항상 필요한 정책·제약·인덱스만 둔다. 절차 상세는 매뉴얼·SKILL로 분리한다.

## 프로젝트 개요

Rigloom은 GLB 검사·휴머노이드 리깅·VRM 1.0 변환을 목표로 하는 로컬 우선 브라우저 작업실이다. 현재 구현 범위와 계획을 구분한다.

## 하이퍼-워터폴 핵심 규칙

이 프로젝트는 **하이퍼-워터폴** 방법론을 적용한다. 에이전트의 기본 동작(빠른 실행, 자율 수정)과 충돌하므로 반드시 숙지한다. 상세: [`agent_code_hyperfall_rule_conflict.md`](mydocs/manual/agent_code_hyperfall_rule_conflict.md).

- 소스 수정 전 반드시 작업지시자 승인 요청
- 작업은 GitHub Issue 기준으로 추적
- 새 기능, 버그 수정, 구조 변경은 `이슈 -> 브랜치 -> 오늘할일 -> 계획서 -> 구현 -> 검증 -> 최종 보고서 -> PR` 순서 절대 생략 금지
- 각 단계 완료 후 승인 없이 다음 단계 진행 금지
- 범위가 불명확하거나 기존 작업과 충돌할 가능성이 있으면 먼저 확인
- 사용자나 다른 작업자가 만든 변경은 되돌리지 않음
- 이슈 close는 작업지시자 승인 후 또는 PR merge 확인 후에만 수행
- 문서 수정은 기존 내용을 먼저 읽고 필요한 부분만 수정하며, 불가피할 때만 내용을 추가
- 제품/사용자/기여자/외부 통합/API/아키텍처/로드맵 문서를 생성, 이동, 수정할 때는 수행계획서에 문서 위치 판단을 기록하고 승인받음
- `mydocs/manual`은 대상 프로젝트 제품 문서 위치가 아니며, 공식 문서 루트(`docs/`, `specs/`, `site/`, `website/`, `adr/` 등)는 대상 프로젝트가 별도 task에서 명시적으로 선택
- 작업 완료 후 다음 작업에 필요하지 않은 로컬/원격 부산물은 정리
- PR merge와 이슈 close 후에는 `main`로 돌아오고, 더 이상 필요 없는 `local/task{번호}` 브랜치와 임시 worktree를 정리

**승인 간주 조건**: 작업지시자가 같은 스레드에서 "계속 진행", "다음 단계 진행"처럼 명시 지시한 경우에만 해당 단계 승인으로 간주한다.

## 명명 규칙

- 마일스톤: `M{버전}` (예: M100=v1.0.0, M05x=v0.5.x). 문서 파일명은 `m{숫자}` 소문자 (예: `m100`)
- 브랜치: `local/task{이슈번호}` (작업), `publish/task{이슈번호}` (`main` 대상 PR 게시용)
- 커밋 메시지:
  - 기본형: `Task #{번호}: 내용`
  - 단계: `Task #{번호} Stage {N}: 내용`
  - 하위 단계: `Task #{번호} [Stage {N.M}]: 내용`
  - 보고서 묶음: `Task #{번호} Stage {N} + 최종 보고서: 내용`
- 문서 파일명: `task_{milestone}_{이슈번호}{_impl|_stage{N}|_report}?.md`. 신규 문서는 마일스톤 포함 형식 강제. 상세: [`document_structure_guide.md`](mydocs/manual/document_structure_guide.md)
- 모든 문서는 이 저장소에 선택된 Hyper-Waterfall locale로 작성한다.

## 핵심 강제 규칙 (변경 전 매뉴얼 확인 필수)

- Rigloom은 독립 저장소다. drum-vrm 체크아웃을 수정·재개·브랜치 전환·정리하지 않는다. 읽기 전용 참조는 가능하며 통합 검증은 별도 합의한 로컬 환경에서 한다.
- 작업을 재개할 때 [mydocs 인덱스](mydocs/README.md) → 해당 날짜 보드 → 실제 GitHub 이슈/PR → 승인된 계획 → 마지막 단계 결과를 확인한다. 요구사항·설계는 specs, 실제 사용법은 docs, 일시적 실행 증거는 mydocs가 맡는다.
- 최신 소유자 지시: #17을 검토해 문제가 없으면 병합하고, #18을 main으로 재지정한 뒤 재검증하여 병합한다. #4와 후속 제품 구현은 새 승인까지 시작하지 않는다. [승인 범위](mydocs/feedback/20261025_documentation-approval.md)를 확인하고 일반적인 다음 작업·릴리스·배포 승인으로 확대하지 않는다.
- 소유자 지시 없는 PR 병합·자동 병합은 금지다. 릴리스 태그·GitHub Release·호스팅 배포·모델 공개 편입은 정확한 배치별 명시적 승인 없이는 수행하지 않는다. [릴리스 정책](specs/policies/release.md)에 따라 결과물을 준비하고 승인받는다.
- 현행 통합 브랜치는 main이다. base/release가 모두 main이므로 원본 매뉴얼의 main→main release PR 예시는 실행하지 않는다. 브랜치·배포 체계 변경은 별도 승인 작업이다.
- 소유자와 한국어로 소통하며 선택 locale에 맞춰 한국어 단일 문서를 유지한다. 법적 고지·코드 식별자·인용 원문은 정확히 보존한다. 문서 배치·유지보수는 [문서 정책](specs/policies/documentation.md)을 따른다.
- 제품 구현 전 [요구사항](specs/product/requirements.md)과 [아키텍처](specs/architecture/overview.md)를 읽는다. Rust/WASM/Three.js 책임, 단일 취소 Worker, 원형·비율·bind/rest 보존, 캐릭터별 분기 금지, skeleton/weights 분리, M2 완료 기준을 지킨다. 계획·미배포 구현·공개 배포를 구별한다.
- 비공개 모델·대화 원문·인증정보·다운로드·.local 자료를 커밋하지 않는다. 의존성 pin, 개별 코드/데이터/자산 권리와 고지는 [자산·의존성 정책](specs/policies/assets-and-dependencies.md)을 따른다. 불명확한 모델 권리를 CC0로 가정하지 않는다.
- 변경한 설계·ADR·조사·사용자 문서를 함께 갱신하고 실제 PR/commit·실행 검사·제한을 이슈와 작업 보고에 남긴다. [검증 방법](docs/how-to/verification.md)을 따르며 실행 전 통과로 쓰지 않는다. screenshot만으로 skinning/VRM 정확성을 주장하지 않는다.
- 도입한 Hyper Waterfall의 저작권과 MIT 전문은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 보존한다.

## 필수 참조 문서

- [`README.md`](README.md) — 프로젝트 개요, 초기 설정, 빌드
- [`mydocs/manual/document_structure_guide.md`](mydocs/manual/document_structure_guide.md) — `mydocs/` 폴더 역할, 문서 파일명, 외부 PR 폴더 정책, Skills 위치 정책
- [`mydocs/manual/task_workflow_guide.md`](mydocs/manual/task_workflow_guide.md) — 타스크 진행 15단계, 커밋 메시지 규칙, 작업 시간 규칙
- [`mydocs/manual/git_workflow_guide.md`](mydocs/manual/git_workflow_guide.md) — 브랜치 정책, Git 다이어그램, 메인테이너/컨트리뷰터 워크플로우
- [`mydocs/manual/pr_process_guide.md`](mydocs/manual/pr_process_guide.md) — 외부 기여 PR 검토
- [`mydocs/manual/agent_code_hyperfall_rule_conflict.md`](mydocs/manual/agent_code_hyperfall_rule_conflict.md) — 하이퍼-워터폴과 에이전트 기본 동작 충돌 규칙
- [사용자 문서](docs/README.md), [제품·설계 기준](specs/README.md), [작업 기록](mydocs/README.md).

## Agent Skills

하이퍼-워터폴 절차의 정형 시점은 SKILL로 분리한다. 진실 원천은 `mydocs/skills/`이며, Codex(`.agents/skills`)와 Claude Code(`.claude/skills`)는 심볼릭 링크로 동일 본문을 인식한다. 상세: [`document_structure_guide.md`](mydocs/manual/document_structure_guide.md) 의 "Agent Skills 위치 정책".

## 작업 규칙

- 작업 시간의 시작과 종료는 작업지시자가 결정한다. 에이전트가 임의로 작업 종료를 제안하거나 시간을 한정하지 않는다.
