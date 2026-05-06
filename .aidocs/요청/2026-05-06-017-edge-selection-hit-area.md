# REQ-20260506-017 Edge Selection Hit Area

## 상태

완료

## 요청

Select mode에서 edge가 잘 선택되지 않고, 선택된 object 표시가 약하다.

- Edge 선택이 쉬워야 한다.
- 선택된 node/edge가 더 확실히 보여야 한다.
- Blur 또는 glow처럼 빛나는 시각 효과가 필요하다.

## 결정

- Mermaid가 그린 실제 edge path는 시각 표현으로 유지한다.
- Edge마다 투명에 가까운 넓은 SVG hit path를 추가해 클릭 가능한 영역을 넓힌다.
- 선택된 node/edge는 기존 stroke 변경에 더해 다중 drop-shadow glow를 적용한다.

## 연결

- 구현: [IMPL-20260506-017 Edge Selection Hit Area](../구현/2026-05-06-017-edge-selection-hit-area.md)
