# REQ-20260506-014 Selection Mode

## 상태

완료

## 요청

Flowchart preview에 선택 모드를 추가한다.

- Tools에 선택 모드가 있어야 한다.
- preview에서 노드와 엣지를 선택할 수 있어야 한다.
- 선택한 항목은 삭제 가능해야 한다.
- 선택한 노드는 우측 패널에서 텍스트를 수정할 수 있어야 한다.
- 선택한 노드는 우측 패널에서 타입을 변경할 수 있어야 한다.

## 결정

- Select tool은 source를 삽입하지 않고 interaction mode만 전환한다.
- Mermaid SVG에 `data-flowchart-node-id`, `data-flowchart-edge-id`를 부여해 preview 선택 대상을 식별한다.
- 노드 텍스트와 타입 변경은 기존 Structure node editor를 선택 상태와 동기화해서 사용한다.
- 삭제는 Mermaid source를 직접 갱신하며, inline edge 라인에 같이 선언된 노드는 별도 node declaration으로 보존한다.

## 연결

- 구현: [IMPL-20260506-014 Selection Mode](../구현/2026-05-06-014-selection-mode.md)
