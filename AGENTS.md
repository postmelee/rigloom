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

- 저장소는 `postmelee/rigloom`이며 drum-vrm과 독립이다. drum-vrm 체크아웃 수정·재개·브랜치 전환·정리는 금지하고 읽기 전용 참조만 허용한다. 통합 검증은 별도 합의한 로컬 환경에서 수행한다.
- 2026-10-25 소유자는 #15 Hyper Waterfall 도입과 #16 문서 재편의 설계·구현·검증·개별 PR 작성을 승인했다. 기존 한영 병행 규칙과 codex/ 브랜치 예외를 제거한다. 이 승인은 #4 또는 이후 제품 구현을 시작할 권한이 아니다. #4는 새 명시적 승인까지 보류한다.
- PR 병합은 소유자의 별도 지시가 있어야 한다. 자동 병합, 릴리스 태그, GitHub Release, Pages/기타 호스팅 배포, 모델의 공개 배포물 편입은 승인된 정확한 배치 없이 수행하지 않는다. CI 통과·병합·과거 drum-vrm 승인은 릴리스 승인이 아니다. 구체적인 변경·검증 SHA·실행 결과·제한·자산 권리를 먼저 준비한다.
- 현행 통합 브랜치는 main이다. BASE_BRANCH와 RELEASE_BRANCH가 모두 main이므로 매뉴얼의 main→main release PR 예시는 실행하지 않는다. 별도 release 브랜치나 배포 방식 변경은 승인된 작업으로 정한다.
- 소유자와 한국어로 소통하고 문서는 선택 locale인 한국어로 작성한다. 법적 고지·코드 식별자·인용 원문은 정확한 원문을 보존한다. 기존 영문/한글 제품 문서의 통합·이동은 별도 #16에서 수행한다.
- Rust는 입력 해석, 내부 모델, 의미 본 매핑, 좌표/rest pose, 가중치, VRM 직렬화/검증·보고를 소유한다. WASM은 좁은 연결이고 Three.js/TypeScript는 렌더링·상호작용을 소유한다. Rust를 DOM/Three.js에 종속시키지 않는다.
- 단일 취소 가능한 Worker와 진행 단계·revision 무효화부터 시작한다. 공유 메모리/다중 스레드 WASM은 측정된 이점과 배포 요구가 있을 때만 채택한다. 기본은 로컬 모델 처리이며 업로드·telemetry를 추가하지 않는다. 실제 네트워크를 확인한 범위만 주장한다.
- 유효한 기존 skeleton/weights와 비표준 비율을 보존한다. rest transform·inverse bind·skin 좌표를 함께 다룬다. 캐릭터별 분기는 금지하고 파일별 매핑·수정은 데이터로 저장한다. 지원하지 않는 구조·리소스·확장·애니메이션·재질·geometry를 조용히 삭제하지 않는다.
- 초기 입력은 self-contained glTF 2.0 GLB와 여러 mesh를 포함할 수 있는 단일 humanoid다. T/A pose rigged/unrigged를 목표로 한다. 첫 출력 목표는 VRM 1.0·편집 프로젝트·검증 보고서다. FBX/PMX/PMD/BLEND 직접 입력은 초기 범위 밖이다. 목표와 실제 구현/미배포/배포를 구별하며 M1 완료를 전체 MVP 완료로 보지 않는다. M2가 핵심이다.
- 관절 배치는 깊이·정면/측면·대칭 토글·x-ray/반투명·선택·undo/redo·reset을 요구한다. 편집과 재생 모드를 구별하고 관절 수정은 파생 weights를 무효화한다. skeleton 생성과 skinning은 별개이며 nearest-bone만으로 품질을 판정하지 않는다.
- 가중치 유한성·비음수·정규화·joint index·미가중 vertex를 검사한다. 근접 신체 부위, 구멍/얇은 표면, 분리 mesh/옷, rigid parts, 비대칭을 검증하고 폐곡면·체적 가정을 확인한다. 파일 유효성과 자연스러운 변형은 별도 판정이다.
- 손가락은 후속이며 주먹/장갑 geometry에서 독립 손가락 생성은 약속하지 않는다. PBR와 MToon, 표정·시선·물리는 구분한다. 불명확한 모델 권리를 CC0로 가정하지 않는다.
- 의존성은 버전/commit·라이선스를 고정하고 lockfile·조사 대장·고지를 갱신한다. 논문·코드·dataset·weights·asset을 구분하고 MIT와 충돌하는 코드를 검토 없이 복사하지 않는다. C++ 구현 존재는 Rust/WASM 실행 가능성의 증거가 아니다.
- 원본 생성 fixture/동작을 우선한다. 비공개 모델·대화 원문·인증정보·외부 다운로드·개인 .local 자료를 커밋하지 않는다. 조사·다운로드·로컬 검사·공개 영상·재배포 권리는 각각 확인한다. 관심 캐릭터는 승인 자산이 아니다.
- UI는 명확한 도구·light/dark·단일 SVG icon library·큰 viewport·문맥 설정·취소·대응 가능한 오류·키보드 접근을 우선한다.
- 변경한 설계/ADR/조사/사용자 문서를 함께 갱신한다. 이슈에 실제 PR/commit·실행 검사·제한을 기록한다. 검사를 실행하기 전에 통과로 쓰지 않고 screenshot만으로 skinning/VRM 정확성을 주장하지 않는다. 한계는 기록된 입력/브라우저/하드웨어로 측정하며 drum-vrm 수치를 차용하지 않는다.

### 도입한 프레임워크의 라이선스 고지

Hyper Waterfall v0.3.0의 매뉴얼·템플릿·skills·운영 규칙은 다음 MIT 고지를 따른다. 도입 PR은 strict manifest 범위를 지키기 위해 프로젝트 전용 구역에 원문을 보존한다.

```text
MIT License

Copyright (c) 2026 postmelee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 필수 참조 문서

- [`README.md`](README.md) — 프로젝트 개요, 초기 설정, 빌드
- [`mydocs/manual/document_structure_guide.md`](mydocs/manual/document_structure_guide.md) — `mydocs/` 폴더 역할, 문서 파일명, 외부 PR 폴더 정책, Skills 위치 정책
- [`mydocs/manual/task_workflow_guide.md`](mydocs/manual/task_workflow_guide.md) — 타스크 진행 15단계, 커밋 메시지 규칙, 작업 시간 규칙
- [`mydocs/manual/git_workflow_guide.md`](mydocs/manual/git_workflow_guide.md) — 브랜치 정책, Git 다이어그램, 메인테이너/컨트리뷰터 워크플로우
- [`mydocs/manual/pr_process_guide.md`](mydocs/manual/pr_process_guide.md) — 외부 기여 PR 검토
- [`mydocs/manual/agent_code_hyperfall_rule_conflict.md`](mydocs/manual/agent_code_hyperfall_rule_conflict.md) — 하이퍼-워터폴과 에이전트 기본 동작 충돌 규칙
- [기존 설계](docs/product-requirements.md), [아키텍처](docs/architecture.md), [릴리스 정책](docs/release-policy.md), [검증 기록](docs/validation.md). 문서 재편은 #16에서 별도로 진행한다.

## Agent Skills

하이퍼-워터폴 절차의 정형 시점은 SKILL로 분리한다. 진실 원천은 `mydocs/skills/`이며, Codex(`.agents/skills`)와 Claude Code(`.claude/skills`)는 심볼릭 링크로 동일 본문을 인식한다. 상세: [`document_structure_guide.md`](mydocs/manual/document_structure_guide.md) 의 "Agent Skills 위치 정책".

## 작업 규칙

- 작업 시간의 시작과 종료는 작업지시자가 결정한다. 에이전트가 임의로 작업 종료를 제안하거나 시간을 한정하지 않는다.
