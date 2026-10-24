# Task #16 Stage 2 — 작업 기록과 정책 연결

[이슈 #16](https://github.com/postmelee/rigloom/issues/16) · [구현계획서](../plans/task_m0_16_impl.md).

## 단계 목적

현재 사용법·상시 기준에서 날짜별 실행 증거와 조사 기록을 분리하고 한영 중복 및 전역 handoff 누적을 끝낸다.

## 산출물

| 경로                              | 변경                                                         |
| --------------------------------- | ------------------------------------------------------------ |
| mydocs/README.md                  | 보드→실제 이슈→승인 계획→마지막 단계 재개 경로와 자료 인덱스 |
| mydocs/tech/task_m0_2_*           | 조사·라이선스의 한국어 이관과 JSON 원문 보존                 |
| mydocs/report/task_m1_3_report.md | 초기16→검토20개 테스트, 날짜·SHA·fixture·제한 이관           |
| specs/policies/documentation.md   | 문서 책임·갱신 기준·framework 원문 보호                      |
| AGENTS.md, THIRD_PARTY_NOTICES.md | 프로젝트 구역 축소·새 위치 연결·MIT 전문 이동                |
| 기존 README.ko와 docs 13개 경로   | 새 책임별 문서로 통합 후 제거                                |

## 본문 변경 정도 / 본문 무손실 여부

본문은 번역·분리·요약했으며 실행 수치, 검증 SHA, 미해결 채택 조건과 제한은 보존했다. 이전 라이선스 대장의 Rigloom 저작권 표기는 루트 LICENSE의 Taegyu Lee로 바로잡고 Hyper Waterfall의 postmelee와 구분했다. JSON 두 파일은 바이트 단위로 동일하다. 이전 파일 전체는 Git 이력에 남는다. 과거 Stage 승인이나 새로운 제품 테스트를 만들지 않았다.

## 검증 결과

- `python3 /private/tmp/rigloom-check-docs.py`: 설치 파일 50개 해시 동일, AGENTS의 placeholder 외 원문 동일, upstream MIT 전문 포함, JSON 두 개 byte 일치, 제품·build·CI diff 없음.
- 같은 검사의 프로젝트 Markdown 39개·내부 링크/anchor 164개: 오류 0개(이 보고서 추가 전).
- `git diff --check`: 통과.
- 이전 docs 경로 검색: 연구 이관 출처와 역사 기록 표기만 남으며 현재 탐색 링크는 새 경로를 사용한다.

검사 스크립트는 이 작업의 임시 검증 도구이며 제품 의존성이나 CI 구성에 추가하지 않았다.

## 잔여 위험

이전 외부 deep link는 자동 리다이렉트하지 않는다. 최종 보고서의 이동표와 고정된 이전 Git commit으로 과거 문서에 접근할 수 있다. 프레임워크 템플릿의 예시 placeholder·원본 저장소 경로는 사용자 문서의 깨진 링크와 구별했다.

## 다음 단계와 승인 범위

승인된 범위에서 Stage 3의 Markdown/Mermaid·최종 링크·독립 검토·PR 확인을 진행한다. 이 단계는 #4 구현·병합·릴리스·배포를 승인하지 않는다.
