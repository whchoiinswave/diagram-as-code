# IMPL-20260506-014 Selection Mode

## 관련 요청

- [REQ-20260506-014 Selection Mode](../요청/2026-05-06-014-selection-mode.md)

## 구현 내용

Flowchart preview의 노드와 엣지를 직접 선택하고 우측 Structure 패널에서 편집/삭제할 수 있게 했다.

추가/수정:

- `src/App.tsx`
  - selection mode와 selected element 상태 추가
  - Select tool, preview 선택, Structure panel 선택 상태를 동기화
  - Delete/Backspace로 선택 항목 삭제
  - Edge mode와 Selection mode가 서로 충돌하지 않도록 mode 전환 처리
- `src/components/tool-palette/ToolPalette.tsx`
  - Select tool 추가
  - Select tool title/aria-label/tooltip과 active 상태 지원
- `src/components/preview/DiagramPreview.tsx`
  - Mermaid SVG node/edge annotation 추가
  - selection mode에서 preview node/edge click을 App으로 전달
  - 선택된 node/edge에 `is-selected` class 부여
- `src/components/structure/FlowchartStructurePanel.tsx`
  - 선택된 node를 node editor에 동기화
  - edge list와 selected edge detail 추가
  - selected node/edge delete button 추가
- `src/diagram/flowchart-structure.ts`
  - `FlowchartSelection` type 추가
  - line/dotted/thick edge parser 보강
  - `deleteFlowchartNode`, `deleteFlowchartEdge` 추가
- `src/styles.css`
  - selection mode cursor, selected node/edge highlight, edge list, delete button style 추가
- 테스트
  - flowchart parser/delete 단위 테스트 추가
  - preview node/edge selection 테스트 추가
  - tool palette select mode 테스트 추가
  - structure panel selection/delete 테스트 추가
  - Playwright node/edge selection 및 삭제 테스트 추가

## 검증

- `npm run typecheck` 통과
- `npm run test` 통과: 21 files, 78 tests
- `npm run lint` 통과
- `npm run test:e2e` 통과: 15 tests
- `npm run build` 통과

## 남은 확장 후보

- 선택된 edge의 label/type 직접 수정
- 다중 선택과 bulk delete
- preview edge hit area 보강용 별도 transparent interaction path
