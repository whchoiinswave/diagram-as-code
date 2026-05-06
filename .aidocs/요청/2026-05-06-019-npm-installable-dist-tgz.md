# REQ-20260506-019 Npm Installable Dist Tgz

## 상태

완료

## 요청

`npm install -g ./diagram-as-code-0.1.0-dist.tgz` 실행 시 `package.json`을 찾지 못하는 오류가 발생했다.

```text
npm error enoent Could not read package.json
```

## 원인

기존 `diagram-as-code-0.1.0-dist.tgz`는 정적 배포 파일(`index.html`, `assets/`)만 포함한 archive였고, npm package tarball이 기대하는 `package/package.json` 구조가 없었다.

## 결정

- `dist` tarball을 npm package 형식으로 생성한다.
- 전역 설치 후 실행할 수 있도록 `diagram-as-code` CLI를 포함한다.
- CLI는 package에 포함된 정적 `dist`를 Node 내장 HTTP 서버로 제공한다.

## 연결

- 구현: [IMPL-20260506-019 Npm Installable Dist Tgz](../구현/2026-05-06-019-npm-installable-dist-tgz.md)
