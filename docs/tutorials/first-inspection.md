# 처음 GLB 검사하기

이 튜토리얼에서는 직접 생성한 삼각형 하나를 검사하고 JSON 보고서를 저장합니다. 이 예제는 구조를 익히는 용도이며 휴머노이드 리깅 품질을 보여 주는 모델은 아닙니다.

[로컬 실행 환경](../how-to/local-development.md)을 준비하고 저장소 루트에서 다음을 실행하세요.

```sh
npm run fixtures
npm run dev
```

## 파일 열기

터미널에 표시된 localhost 주소를 브라우저에서 엽니다. **Open GLB**를 누르고 저장소의 `.local/fixtures/surface.glb`를 선택하세요. 파일 선택 창에서 숨김 디렉터리가 보이지 않으면 경로를 직접 입력합니다.

검사가 끝나면 삼각형 미리보기와 `Inspection complete. Preview ready.` 상태가 나타납니다. WebGL을 사용할 수 없으면 검사 결과만 표시됩니다.

오른쪽 검사 패널에서 다음을 확인하세요.

- `Meshes`는 1, `Vertices`는 3, `Skins`는 0입니다.
- `unrigged`는 이 파일에 스킨이 없다는 경고입니다.
- `inspection_only`는 미리보기가 리깅·VRM 정확성을 보증하지 않는다는 경고입니다.

이 예제에서 두 경고는 예상된 결과이며 미리보기를 차단하지 않습니다.

## 둘러보고 보고서 저장하기

마우스로 드래그해 회전하고, 스크롤로 확대하며, 오른쪽 버튼을 누른 채 드래그해 이동해 보세요. **Front**, **Side**, **Free**는 카메라 시점을 바꿉니다. 삼각형을 옆에서 보면 가늘게 보일 수 있습니다. 이 조작은 모델의 방향이나 바인드 자세를 수정하지 않습니다.

**Node hierarchy**를 펼쳐 노드 목록을 확인한 뒤 **Save report**를 누르세요. 내려받은 `rigloom-inspection.json`에는 `schema_version: 1`, `preview_allowed: true`와 위 경고가 들어 있습니다. 이 파일은 검사 결과이며 모델·프로젝트·VRM 파일이 아닙니다.

다음으로 `.local/fixtures/external.glb`를 열어 보세요. `resource_uri` 진단과 함께 미리보기가 차단됩니다. 이 예제는 외부 리소스 요청을 차단하는 동작을 확인하기 위한 파일입니다. 다시 `surface.glb`를 열면 정상 검사를 반복할 수 있습니다.

[지원 입력](../reference/supported-inputs.md)과 [보고서 필드](../reference/inspection-report.md)를 읽으면 자신의 파일을 검사할 준비가 됩니다.
