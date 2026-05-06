# IMPL-20260506-016 Selection Editor Separation

## 관련 요청

- [REQ-20260506-016 Selection Editor Separation](../요청/2026-05-06-016-selection-editor-separation.md)

## 구현 내용

Select mode에서 선택 항목 편집 화면과 edge 연결 화면이 섞이지 않도록 분리했다.

추가/수정:

- `src/App.tsx`
  - Select mode에서 노드 선택 시 edge draft를 갱신하던 side effect 제거
- `src/components/structure/FlowchartStructurePanel.tsx`
  - `selectionModeActive && !edgeModeActive` 상태에서는 연결용 `Edge editor` 숨김
  - 선택된 edge 전용 편집 폼 추가
  - 선택된 edge의 source, target, type, label 수정 후 `Apply edge change`로 source 갱신
- `src/diagram/flowchart-structure.ts`
  - `updateFlowchartEdge` 추가
  - edge formatting helper를 `addFlowchartEdge`와 공유
  - inline node declaration이 포함된 edge를 수정해도 node declaration을 보존
- 테스트
  - edge update 단위 테스트 추가
  - selection mode에서 연결 폼이 숨겨지는지 검증
  - selected edge 수정/삭제 단위 테스트와 E2E 검증 보강

## 검증

- `npm run typecheck` 통과
- `npm run test -- src/tests/flowchart-structure.test.ts src/tests/FlowchartStructurePanel.test.tsx` 통과: 19 tests
- `npx playwright test tests/e2e/app.spec.ts -g "selects preview nodes|selects and deletes preview edges|edits flowchart nodes"` 통과: 3 tests
- `npm run test` 통과: 21 files, 80 tests
- `npm run test:e2e` 통과: 15 tests
- `npm run lint` 통과
- `npm run build` 통과
