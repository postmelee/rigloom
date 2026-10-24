# 제3자 고지

Rigloom 소스는 [MIT](LICENSE)이며 외부 의존성에는 각자의 이용 조건이 적용됩니다. 외부 캐릭터 모델·데이터셋·학습 가중치·동작 클립·다운로드 폰트는 포함하지 않았습니다. 생성 테스트 모델은 로컬 검사 출력이며 공개 릴리스 자산이 아닙니다.

## 제품 코드와 개발 도구

런타임은 gltf/gltf-json, serde/serde_json, wasm-bindgen(MIT OR Apache-2.0), Three.js(MIT), lucide 아이콘(ISC)을 사용합니다. 개발 의존성에는 별도 라이선스가 적용됩니다. 정확한 버전과 선언 조건은 [라이선스 대장](mydocs/tech/task_m0_2_licenses.md), [의존성 스냅샷](mydocs/tech/task_m0_2_dependencies.json), Cargo.lock·package-lock.json을 확인하세요.

이 개발 고지는 향후 배포물을 인증하지 않습니다. [릴리스 승인](specs/policies/release.md) 요청 전에 실제 포함 코드의 전체 라이선스 문구와 추가 자산을 감사해야 합니다.

## Hyper Waterfall v0.3.0

작업 체계의 AGENTS 기반, CLAUDE 연결, GitHub 양식, mydocs의 원본 매뉴얼·템플릿·skills·역할 안내는 [Hyper Waterfall](https://github.com/postmelee/hyper-waterfall/tree/v0.3.0)에서 가져왔습니다. 고정 commit은 `83836828a4da24385d0410515d35ee43946b981f`이고 locale과 최초 설치 해시는 [버전 기록](.hyper-waterfall/version.json)에 있습니다. 프로젝트 placeholder 치환과 AGENTS의 지정 프로젝트 구역을 제외한 원문을 보존합니다. 다음 고지는 upstream의 원문입니다.

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
