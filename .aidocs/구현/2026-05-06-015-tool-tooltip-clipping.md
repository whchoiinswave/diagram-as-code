# IMPL-20260506-015 Tool Tooltip Clipping

## 관련 요청

- [REQ-20260506-015 Tool Tooltip Clipping](../요청/2026-05-06-015-tool-tooltip-clipping.md)

## 구현 내용

Tools hover caption이 preview 영역에 가려지지 않도록 tooltip 렌더링 방식을 바꿨다.

추가/수정:

- `src/components/tool-palette/ToolPalette.tsx`
  - hover/focus 시 `getBoundingClientRect()`로 tool button 위치를 계산
  - `createPortal`로 `document.body`에 tooltip 렌더링
  - viewport 왼쪽 공간이 충분하면 버튼 왼쪽, 아니면 오른쪽에 표시
  - click/blur/pointer leave에서 tooltip 해제
- `src/styles.css`
  - `.tool-button::after` 기반 tooltip 제거
  - `.tool-tooltip`, `.tool-tooltip-left`, `.tool-tooltip-right` 스타일 추가
- `src/tests/ToolPalette.test.tsx`
  - hover 시 `role="tooltip"` caption이 렌더링되는지 검증
- `tests/e2e/app.spec.ts`
  - 실제 브라우저에서 tooltip이 visible이고 viewport 밖으로 나가지 않는지 검증

## 검증

- `npm run typecheck` 통과
- `npm run lint` 통과
- `npm run test -- src/tests/ToolPalette.test.tsx` 통과: 8 tests
- `npx playwright test tests/e2e/app.spec.ts -g "shows labels"` 통과: 1 test
- `npm run test` 통과: 21 files, 78 tests
- `npm run test:e2e` 통과: 15 tests
- `npm run build` 통과
