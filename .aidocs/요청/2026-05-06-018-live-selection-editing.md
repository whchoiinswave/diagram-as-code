# REQ-20260506-018 Live Selection Editing

## 상태

완료

## 요청

선택한 노드/엣지의 수정 내용이 저장 또는 적용 버튼 없이 즉시 preview에 반영되면 좋겠다.

## 결정

- 선택 편집 화면의 `Apply` 버튼을 제거한다.
- 노드 label/shape 변경은 입력 이벤트에서 즉시 Mermaid source를 갱신한다.
- 선택된 edge의 source/target/type/label 변경도 입력 이벤트에서 즉시 Mermaid source를 갱신한다.
- Edge의 source/target 변경으로 edge id가 바뀌는 경우 selection도 새 id로 함께 갱신한다.

## 연결

- 구현: [IMPL-20260506-018 Live Selection Editing](../구현/2026-05-06-018-live-selection-editing.md)
