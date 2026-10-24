# Task #16 Stage 3 — 탐색과 보존 검증

[이슈 #16](https://github.com/postmelee/rigloom/issues/16) · [구현계획서](../plans/task_m0_16_impl.md).

## 단계 목적과 산출물

프로젝트 문서의 링크·형식·Mermaid·원본 보존을 검사하고 단계/최종 보고·작업 보드를 정리한다. 제품 소스나 CI는 변경하지 않는다. [최종 보고서](../report/task_m0_16_report.md)에 이동표와 검토 제한을 모았다.

## 본문 변경 정도 / 본문 무손실 여부

프로젝트 문서의 표와 Markdown 형식을 정리했다. 설치된 Hyper Waterfall 문서는 포맷 대상에서 제외하여 원문을 보존했다. 초기 설치 후 AGENTS 변경은 프로젝트 placeholder 구역에만 한정된다. Markdown/JSON 의미와 법적 원문은 보존했다.

## 검증 결과

- 프로젝트 Markdown 링크 검사: 최종 42개 문서·내부 링크/anchor 190개, 오류 0개.
- Prettier 3.9.10의 프로젝트 문서 검사: 통과. framework 원본은 해시로 별도 확인.
- Mermaid 11.12.0 실제 parser: 사용자 흐름과 아키텍처 2개 모두 통과. 도구는 임시 폴더에만 설치했고 제품 의존성을 추가하지 않았다.
- framework 설치 파일 50개 해시 및 AGENTS placeholder 외 원문 일치, MIT 전문 보존, 두 조사 JSON byte 일치.
- src/crates/scripts/tests/빌드 설정/lockfile/CI의 local/task15 대비 diff 없음.
- `git diff --check`: 통과.
- 별도 읽기 전용 검토: 요구사항·권한·현재 기능·UI/보고서·이력·탐색에서 차단할 문제를 발견하지 못했다.

## 잔여 위험

링크 검사는 저장소 내부 경로와 anchor를 다루며 모든 외부 사이트의 가용성을 보증하지 않는다. Mermaid는 구문 검사이며 브라우저별 렌더링 품질 검사는 아니다. 과거 제품 테스트를 이번 로컬 실행 결과로 주장하지 않는다. PR 게시 뒤 정확한 head의 Verify 결과는 해당 PR에 기록한다.

## 다음 단계와 승인 범위

승인된 PR 작성 단계로 진행한다. PR 병합·#4 구현·릴리스·배포는 별도 소유자 지시 전 수행하지 않는다.
