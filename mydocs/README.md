# Rigloom 작업 기록

이 디렉터리는 특정 날짜·이슈·판단의 근거를 보존하는 작업 기억입니다. 사용법은 [docs](../docs/README.md), 요구사항과 채택한 설계는 [specs](../specs/README.md)에 둡니다.

## 작업 재개

1. `orders/`에서 해당 날짜 보드를 읽고 실제 GitHub 이슈·PR 상태를 확인합니다.
2. 그 작업의 승인 범위와 `plans/`의 수행·구현계획을 읽습니다.
3. `working/`의 마지막 단계와 `report/`의 결과에서 검증·제한을 확인합니다.
4. 영향을 받는 specs와 관련 tech/ADR을 읽습니다. 계획이나 보고서의 다음 순서는 실행 권한이 아닙니다.

전역 handoff에 모든 작업의 최신 상태를 다시 쓰지 않습니다. 옛 기록은 당시 증거로 유지하고 실제 상태는 GitHub에서 확인합니다.

## 폴더 안내

| 폴더 | 담는 내용 |
|---|---|
| [orders](orders/README.md) | 날짜별 간결한 작업 보드 |
| [plans](plans/README.md) | 이슈별 수행·구현계획; 완료 후 archives |
| [working](working/README.md) | 실제 단계 결과 |
| [report](report/README.md) | 최종 결과·장기 보관 검증 증거 |
| [feedback](feedback/README.md) | 소유자의 승인·판단과 리뷰 근거 |
| [tech](tech/README.md) | 조사·대안·미확정 채택 조건 |
| [troubleshootings](troubleshootings/README.md) | 재현·원인·해결·재발 방지 |
| [pr](pr/README.md) | 외부 기여자 PR 검토 기록 |
| [manual](manual/README.md) | Hyper Waterfall의 반복 운영 절차 |
| [_templates](_templates/README.md) | 산출물 작성 형식 |
| [skills](skills/README.md) | 에이전트 절차 원본; 두 도구 링크가 공유 |

## 기록 찾기

- [2026-10-25 작업 보드](orders/20261025.md), [문서 재편 승인 범위](feedback/20261025_documentation-approval.md)
- [#16 문서 재편 계획](plans/task_m0_16.md)
- [#3 검사 구현의 과거 검증](report/task_m1_3_report.md)
- [#2 표준·알고리즘 조사](tech/task_m0_2_standards-and-algorithms.md), [라이선스 대장](tech/task_m0_2_licenses.md)
- [의존성 선언 스냅샷](tech/task_m0_2_dependencies.json), [upstream 조사 스냅샷](tech/task_m0_2_source-snapshot.json)

## 프레임워크와 프로젝트 기록의 경계

이 README는 Rigloom의 확장 인덱스입니다. 나머지 역할별 README와 manual·_templates·skills는 [도입 버전](../.hyper-waterfall/version.json)의 원문을 따릅니다. 설치된 문서의 `docs/lifecycle/*`, `templates/manifest.json` 표기는 [Hyper Waterfall 저장소](https://github.com/postmelee/hyper-waterfall/tree/v0.3.0)를 기준으로 하는 경우가 있으며, Rigloom의 사용자 docs에 해당 파일을 만들어 채우지 않습니다. 프로젝트 문서 위치 원칙은 [문서 정책](../specs/policies/documentation.md)에 둡니다.
