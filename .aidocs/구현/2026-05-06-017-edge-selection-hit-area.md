# IMPL-20260506-017 Edge Selection Hit Area

## 관련 요청

- [REQ-20260506-017 Edge Selection Hit Area](../요청/2026-05-06-017-edge-selection-hit-area.md)

## 구현 내용

Preview edge 선택성과 선택 표시를 보강했다.

추가/수정:

- `src/components/preview/DiagramPreview.tsx`
  - edge annotation 시 기존 hit area를 정리하고 새 `.preview-flowchart-edge-hit-area` path 생성
  - hit path는 실제 edge path의 `d`를 복제하되 marker와 접근성 label은 제거
  - hit path에 `data-flowchart-edge-id`를 부여해 기존 selection handler가 그대로 선택 처리
- `src/styles.css`
  - hit path stroke-width를 18px로 설정해 클릭 영역 확대
  - hit path는 거의 보이지 않는 alpha stroke로 유지
  - selected node/edge에 white rim + accent glow를 추가
  - selected edge stroke-width를 4px로 강화
- `src/tests/DiagramPreview.test.tsx`
  - edge hit area가 생성되고 click 시 edge selection이 전달되는지 검증
- `tests/e2e/app.spec.ts`
  - edge hit area 좌표를 실제 마우스로 클릭해 selection/edit/delete 흐름 검증

## 검증

- `npm run typecheck` 통과
- `npm run lint` 통과
- `npm run test -- src/tests/DiagramPreview.test.tsx` 통과: 6 tests
- `npx playwright test tests/e2e/app.spec.ts -g "selects and deletes preview edges|selects preview nodes"` 통과: 2 tests
- `npm run test` 통과: 21 files, 80 tests
- `npm run test:e2e` 통과: 15 tests
- `npm run build` 통과
