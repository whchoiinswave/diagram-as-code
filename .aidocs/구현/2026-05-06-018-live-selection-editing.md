# IMPL-20260506-018 Live Selection Editing

## 관련 요청

- [REQ-20260506-018 Live Selection Editing](../요청/2026-05-06-018-live-selection-editing.md)

## 구현 내용

선택한 노드/엣지의 편집 값을 즉시 source에 반영하도록 바꿨다.

추가/수정:

- `src/components/structure/FlowchartStructurePanel.tsx`
  - node label 입력 시 `updateFlowchartNode`를 즉시 호출
  - node shape 선택 시 `updateFlowchartNode`를 즉시 호출
  - selected edge source/target/type/label 변경 시 `updateFlowchartEdge`를 즉시 호출
  - selected edge source/target 변경으로 edge id가 바뀌면 `onSelectElement`로 선택 상태를 새 id에 동기화
  - 선택 편집 화면의 `Apply` 버튼 제거
- `src/tests/FlowchartStructurePanel.test.tsx`
  - Apply 클릭 없이 source update가 호출되는지 검증하도록 수정
- `tests/e2e/app.spec.ts`
  - 노드/엣지 선택 편집이 Apply 없이 source와 preview에 반영되는지 검증하도록 수정

## 검증

- `npm run typecheck` 통과
- `npm run lint` 통과
- `npm run test -- src/tests/FlowchartStructurePanel.test.tsx` 통과: 9 tests
- `npx playwright test tests/e2e/app.spec.ts -g "selects preview nodes|selects and deletes preview edges|edits flowchart nodes"` 통과: 3 tests
- `npm run test` 통과: 21 files, 80 tests
- `npm run test:e2e` 통과: 15 tests
- `npm run build` 통과
