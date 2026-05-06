# IMPL-20260505-008 Preview 조작과 Tool Drag Drop

## 관련 요청

- [REQ-20260505-008 MVP 구현 계속](../요청/2026-05-05-008-MVP-구현-계속.md)

## 구현 내용

preview와 tool palette의 편집 생산성 기능을 보강했다.

추가한 기능:

- preview pan mode
- preview zoom in/out
- preview fit-to-screen
- preview reset view
- preview zoom percentage 표시
- tool palette item drag/drop
- editor 또는 preview 영역으로 drop 시 source snippet 삽입

## 주요 파일

- `src/components/preview/DiagramPreview.tsx`
- `src/components/tool-palette/ToolPalette.tsx`
- `src/App.tsx`
- `src/styles.css`
- `package.json`
- `package-lock.json`

## 추가 의존성

- `@panzoom/panzoom`
- `@dnd-kit/core`
- `@dnd-kit/modifiers`
- `@dnd-kit/utilities`

## 검증

- `npm run typecheck` 통과
- `npm run test` 통과: 2 files, 5 tests
- `npm run lint` 통과
- `npm run build` 통과
- `npm audit --audit-level=high` 통과
- dev server 재시작 후 `http://localhost:5173/` 응답 확인

## 남은 작업

- 실제 Workspace provider 구현
- 파일 tree 실제 storage 연결
- server launch context와 협업 연동
- Playwright 기반 브라우저 조작 검증
