# REQ-20260506-015 Tool Tooltip Clipping

## 상태

완료

## 요청

우측 Tools에서 마우스를 올렸을 때 나오는 caption이 좌측 preview 영역에 가려진다.

## 결정

- CSS pseudo-element tooltip은 resizable panel의 stacking/overflow 영향으로 가려질 수 있으므로 사용하지 않는다.
- Tooltip을 `document.body` portal로 렌더링해 preview panel 밖에서도 가려지지 않게 한다.
- 기존 `title`, `aria-label`, `data-tooltip`은 접근성과 테스트 안정성을 위해 유지한다.

## 연결

- 구현: [IMPL-20260506-015 Tool Tooltip Clipping](../구현/2026-05-06-015-tool-tooltip-clipping.md)
