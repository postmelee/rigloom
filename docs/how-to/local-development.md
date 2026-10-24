# 로컬 실행과 개발 환경 준비

저장소를 받아 개발 서버에서 Rigloom을 실행하는 절차입니다. 설치 과정은 인터넷에서 개발 도구와 의존성을 내려받습니다.

## 준비

Git, Rust 설치 관리자 `rustup`, Node.js와 npm이 필요합니다. 저장소에서 사용하는 버전은 Rust **1.94.1**, Node.js **24.15.0**, npm **11.12.1**, wasm-pack **0.15.0**입니다. Rust 버전·컴포넌트·WASM 타깃은 `rust-toolchain.toml`, 의존성은 잠금 파일을 기준으로 합니다.

```sh
git clone https://github.com/postmelee/rigloom.git
cd rigloom
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --version 0.15.0 --locked
npm ci
npm run build
npm run dev
```

Vite가 출력하는 `127.0.0.1` 주소를 엽니다. `npm run build`는 WASM 생성, TypeScript 검사, 정적 번들 생성을 수행합니다. `npm run dev` 자체는 WASM을 새로 빌드하지 않으므로 최초 실행 전에 빌드가 필요합니다.

## 변경 후 실행

TypeScript·CSS 변경은 개발 서버가 반영합니다. Rust 코드를 바꾸면 `npm run wasm`으로 WASM을 다시 생성하고 페이지를 새로고침하세요. 배포용 정적 결과를 로컬에서 확인하려면 다음을 실행합니다.

```sh
npm run build
npx vite preview --host 127.0.0.1
```

이 명령은 로컬 확인용 서버이며 공개 배포를 수행하지 않습니다. 서버 종료는 실행 중인 터미널에서 `Ctrl+C`를 누릅니다.

## 예제와 개인 파일

`npm run fixtures`는 직접 만든 GLB 다섯 개를 `.local/fixtures/`에 생성합니다. [첫 검사 튜토리얼](../tutorials/first-inspection.md)에서 사용합니다. 개인 모델과 임시 자료도 Git에서 제외되는 `.local/`에 두고 커밋하지 마세요.

검증 명령과 목적은 [변경 사항 검증](verification.md), 개발 작업 절차는 [AGENTS.md](../../AGENTS.md)를 따릅니다.
