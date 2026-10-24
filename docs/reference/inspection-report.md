# 검사 보고서

**Save report**는 `rigloom-inspection.json`을 내려받습니다. 현재 스키마 버전은 **1**이며 모델 원본, 프로젝트 상태 또는 VRM을 포함하지 않습니다. 보고서에 모델의 노드 이름이 들어갈 수 있습니다.

| 필드 | 의미 |
|---|---|
| `schema_version` | 보고서 구조 버전. 현재 `1` |
| `preview_allowed` | 검사기의 정책상 정적 미리보기를 시도할 수 있는지 여부 |
| `inventory` | 파일의 메시·노드 연결·형상·스킨 등 개수 |
| `nodes` | 노드 인덱스, 이름, 자식·메시·스킨 참조와 로컬 변환 |
| `diagnostics` | 오류·경고 목록 |

`preview_allowed: true`는 휴머노이드 판별, 스킨 품질, 바인드 정확성, VRM 적합성 또는 렌더링 성공을 보증하지 않습니다. 조기 오류로 검사를 끝낸 경우 목록·개수는 비어 있거나 부분적으로 채워질 수 있습니다. 오류가 있는 보고서의 0을 대상이 없다는 확정 결과로 해석하지 마세요.

## 목록과 노드

`inventory`의 `meshes`, `primitives`, `skins`, `animations`, `images`는 각 리소스의 개수입니다. `mesh_instances`는 메시를 참조하는 노드 수, `joints`는 각 스킨의 관절 참조 수를 합한 값입니다. 같은 관절이 여러 스킨에 있으면 중복 집계되며 고유 본 개수가 아닙니다. `vertices`는 검사한 primitive의 POSITION 수를 합산하며 메시 인스턴스 수를 곱하지 않습니다.

각 `nodes` 항목의 `index`는 원본 glTF 노드 인덱스입니다. `name`은 없으면 `null`이고, `children`은 자식 인덱스 배열입니다. `mesh`와 `skin`은 리소스 인덱스 또는 `null`입니다. `local_matrix`는 glTF 노드의 로컬 4×4 변환 행렬이며 바깥 배열이 열을 나타냅니다. 월드 변환이나 역바인드 행렬이 아닙니다.

## 진단

각 진단은 `severity` (`error` 또는 `warning`), `code`, `path`, `message`, `remedy`를 가집니다. `path`는 `/meshes/0/primitives/0`처럼 문제 위치를 가리키며 `/`는 파일 전체를 뜻합니다. 오류는 미리보기를 차단하고, 경고는 제한을 알립니다.

| 코드 | 의미 |
|---|---|
| `invalid_glb`, `invalid_json`, `invalid_gltf` | GLB 포장, JSON, glTF 스키마·참조 오류 |
| `resource_uri`, `unsupported_extension` | 지원하지 않는 URI 리소스 또는 확장 |
| `buffer_length`, `buffer_view_bounds`, `accessor_bounds` | 바이너리 길이·범위·저장 배치 오류 |
| `accessor_count`, `accessor_storage`, `sparse_accessor` | 빈 접근자, 조밀한 저장소 없음, 희소 접근자 |
| `node_multiple_parents`, `node_cycle`, `scene_root_parent` | 노드 계층 오류 |
| `no_meshes`, `scene_count` | 메시 없음 또는 장면 수 조건 위반 |
| `primitive_mode`, `missing_positions`, `position_layout`, `index_layout` | 형상 종류·위치·인덱스 형식 오류 |
| `nonfinite_positions`, `attribute_count`, `invalid_indices`, `triangle_count` | 좌표·속성 개수·삼각형 위상 오류 |
| `unrigged` | 스킨이 없는 입력이라는 경고 |
| `animations_static` | 애니메이션은 집계만 하고 정적으로 표시한다는 경고 |
| `inspection_only` | 검사는 리깅·VRM 인증이 아니라는 경고 |

[문제 해결 절차](../how-to/troubleshoot-inspection.md) · [지원 입력](supported-inputs.md)
