# REQ-20260506-016 Selection Editor Separation

## 상태

완료

## 요청

우측 Select tool로 노드나 엣지를 선택했는데, Edge 속성이 나온 이후로는 edge 연결만 되는 문제가 있다.

- Select mode에서는 선택한 노드/엣지의 수정 화면이 나와야 한다.
- Edge 연결 화면과 선택한 edge 수정 화면은 분리되어야 한다.

## 결정

- Select mode에서는 연결용 `Edge editor`를 숨긴다.
- Edge 연결은 Edge tool이 활성화된 경우에만 노출한다.
- 선택된 edge는 별도 `Selected edge` 편집 화면에서 source, target, type, label을 수정한다.

## 연결

- 구현: [IMPL-20260506-016 Selection Editor Separation](../구현/2026-05-06-016-selection-editor-separation.md)
