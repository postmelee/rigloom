# Rigloom

브라우저에서 휴머노이드 모델을 검사하고 리깅을 준비하는 도구입니다. Rust, WebAssembly, Three.js로 만들며, 장기적으로 관절 배치·스키닝·보정을 거쳐 VRM 1.0으로 내보내는 작업을 목표로 합니다.

현재는 **읽기 전용 GLB 검사, 3D 정적 미리보기, 검사 보고서 저장**을 사용할 수 있습니다. 휴머노이드 매핑, 관절 편집, 가중치 생성, 프로젝트 저장·복원, VRM 출력은 아직 구현하지 않았습니다. 공개 서비스와 릴리스는 없으며 로컬에서 실행합니다.

## 시작하기

[로컬 실행 환경을 준비](docs/how-to/local-development.md)한 뒤 [처음 GLB 검사하기](docs/tutorials/first-inspection.md)를 따라 해 보세요. 직접 생성한 작은 예제로 검사 결과와 화면 조작을 익힐 수 있습니다.

| 하고 싶은 일 | 읽을 문서 |
|---|---|
| 문서 전체에서 필요한 내용 찾기 | [문서 안내](docs/README.md) |
| 내 파일을 사용할 수 있는지 확인하기 | [지원 입력과 제한](docs/reference/supported-inputs.md) |
| 파일을 열지 못하는 문제 해결하기 | [검사 문제 해결](docs/how-to/troubleshoot-inspection.md) |
| 내려받은 JSON 이해하기 | [검사 보고서 참조](docs/reference/inspection-report.md) |
| 파일 처리 방식 이해하기 | [검사와 미리보기의 역할](docs/explanation/processing-model.md) |

## 기여하기

제품의 목표와 설계 기준은 [specs](specs/README.md), 개발·검증 방법은 [로컬 개발](docs/how-to/local-development.md)과 [검증 방법](docs/how-to/verification.md)에 있습니다. 실행할 작업은 [GitHub 이슈](https://github.com/postmelee/rigloom/issues)에서 확인하고, 저장소 작업 절차는 [AGENTS.md](AGENTS.md)와 [작업 기록 안내](mydocs/README.md)를 따릅니다.

## 라이선스

Rigloom 코드는 [MIT](LICENSE)입니다. 의존성 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요. 외부 모델 에셋은 포함하지 않습니다. 모델 변환은 원본의 이용·재배포 권리를 바꾸지 않습니다.
