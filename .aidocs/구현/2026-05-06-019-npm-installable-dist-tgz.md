# IMPL-20260506-019 Npm Installable Dist Tgz

## 관련 요청

- [REQ-20260506-019 Npm Installable Dist Tgz](../요청/2026-05-06-019-npm-installable-dist-tgz.md)

## 구현 내용

`dist/diagram-as-code-0.1.0-dist.tgz`를 npm 전역 설치 가능한 package tarball로 다시 만들 수 있게 했다.

추가/수정:

- `bin/diagram-as-code.js`
  - 전역 설치 후 실행되는 CLI 추가
  - bundled `dist` 폴더를 Node 내장 HTTP 서버로 제공
  - `--host`, `--port`, `--help` 옵션 지원
- `scripts/pack-dist.mjs`
  - `npm run build` 결과물을 임시 npm package 구조로 복사
  - `package/package.json`, `bin`, `dist`, `README.md`를 포함한 tgz 생성
  - 최종 파일을 `dist/diagram-as-code-0.1.0-dist.tgz`로 저장
- `package.json`
  - `pack:dist` script 추가
- `eslint.config.js`
  - Node CLI/script 파일용 globals 추가
- `README.md`
  - installable tarball 생성과 설치 명령 추가

## 검증

- `npm run typecheck` 통과
- `npm run test` 통과: 21 files, 80 tests
- `npm run lint` 통과
- `npm run pack:dist` 통과
- `npm install -g ./dist/diagram-as-code-0.1.0-dist.tgz --prefix /tmp/diagram-as-code-install` 통과
- `/tmp/diagram-as-code-install/bin/diagram-as-code --help` 통과

## 산출물

- `dist/diagram-as-code-0.1.0-dist.tgz`
- SHA-256: `a5fef2e4d475a160983ad42d650ace5dbed4d6517395241d02cd205f08fc0bdf`
