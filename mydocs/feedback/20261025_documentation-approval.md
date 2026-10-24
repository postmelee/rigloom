# 문서 구조 개편 승인 기록 — 2026-10-25

대상: [#15](https://github.com/postmelee/rigloom/issues/15), [#16](https://github.com/postmelee/rigloom/issues/16).

소유자가 같은 작업 대화에서 제안한 설계를 승인하고 두 작업을 별도 이슈·PR로 진행하도록 지시했다. 아래는 실행 권한을 재개할 때 확인할 요약이며 대화 원문은 저장하지 않는다. GitHub 이슈에도 같은 범위를 기록했다.

- Hyper Waterfall v0.3.0 한국어 도입 후 docs / specs / mydocs 구조로 문서를 재편한다.
- 기존 한영 병행 문서 규칙과 codex/ 브랜치 예외를 제거한다. 한국어 단일 문서로 통합하고 local/taskN → publish/taskN을 사용한다.
- 설계에 포함된 문서 이동·재작성·검증·개별 PR 작성까지 이번 지시 범위로 진행한다. 문서 위치 판단은 [수행계획서](../plans/task_m0_16.md)에 구체화한다.
- #4 제품 구현과 릴리스·배포는 보류한다. PR 병합 지시도 이번 요청에 포함되지 않았다.

이 기록은 에이전트가 새로운 승인을 부여하거나 단계별 별도 승인을 받은 것으로 소급 기록하는 문서가 아니다. 범위가 바뀌면 소유자의 새 지시를 확인한다. 일반적인 후속 task에는 Hyper Waterfall의 승인 절차를 적용한다.

## 후속 검토·병합 승인 — 2026-10-25

소유자는 위 문서 작업의 결과를 받은 뒤 같은 대화에서 다음 순서를 명시적으로 승인했다. 이 절은 앞의 PR 작성까지라는 범위를 확장한 후속 지시를 기록하며, 과거 승인 내용을 바꾸지 않는다.

1. [PR #17](https://github.com/postmelee/rigloom/pull/17)을 검토하고 문제가 없으면 병합한다.
2. [PR #18](https://github.com/postmelee/rigloom/pull/18)을 main으로 재지정하고 다시 검증하여 병합한다.
3. #4 구현과 릴리스·배포는 계속 보류한다. 다른 제품 구현이나 이후 PR의 병합 승인으로 확대하지 않는다.

실제 검토·검증·병합 결과와 SHA는 각 PR 및 [#15](https://github.com/postmelee/rigloom/issues/15)·[#16](https://github.com/postmelee/rigloom/issues/16)에 기록한다. 승인 기록 자체는 병합 성공의 증거가 아니다.
