import Panzoom from '@panzoom/panzoom';
import { Hand, Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type {
  FlowchartEdge,
  FlowchartEdgeDraft,
  FlowchartNode,
  FlowchartSelection,
} from '../../diagram/flowchart-structure';
import type { RenderState } from '../../diagram/types';

type DiagramPreviewProps = {
  renderState: RenderState;
  flowchartNodes?: Pick<FlowchartNode, 'id' | 'label'>[];
  flowchartEdges?: Pick<FlowchartEdge, 'id' | 'from' | 'to' | 'label'>[];
  edgeDraft?: FlowchartEdgeDraft;
  edgeModeActive?: boolean;
  selectionModeActive?: boolean;
  selectedElement?: FlowchartSelection | null;
  onEdgeConnect?: (from: string, to: string) => void;
  onEdgeDragStart?: (from: string) => void;
  onEdgeNodeClick?: (nodeId: string) => void;
  onSelectElement?: (selection: FlowchartSelection) => void;
};

type SurfacePoint = {
  x: number;
  y: number;
};

type PendingEdgeDrag = {
  from: string;
  pointerId: number;
  start: SurfacePoint;
  current: SurfacePoint;
  dragging: boolean;
};

function matchNodeIdFromElementId(elementId: string, nodeIds: string[]): string | null {
  if (!elementId) {
    return null;
  }

  const orderedNodeIds = [...nodeIds].sort((a, b) => b.length - a.length);

  return (
    orderedNodeIds.find(
      (nodeId) =>
        elementId === nodeId ||
        elementId === `flowchart-${nodeId}` ||
        elementId.startsWith(`flowchart-${nodeId}-`) ||
        elementId.includes(`-${nodeId}-`),
    ) ?? null
  );
}

function findNodeIdFromElement(target: EventTarget | Element | null, nodeIds: string[]): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  let element: Element | null = target;

  while (element) {
    const explicitNodeId = element.getAttribute('data-flowchart-node-id');

    if (explicitNodeId && nodeIds.includes(explicitNodeId)) {
      return explicitNodeId;
    }

    const matchedId = matchNodeIdFromElementId(element.id, nodeIds);

    if (matchedId) {
      return matchedId;
    }

    element = element.parentElement;
  }

  return null;
}

function findEdgeIdFromElement(target: EventTarget | Element | null, edgeIds: string[]): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  let element: Element | null = target;

  while (element) {
    const edgeId = element.getAttribute('data-flowchart-edge-id');

    if (edgeId && edgeIds.includes(edgeId)) {
      return edgeId;
    }

    element = element.parentElement;
  }

  return null;
}

function annotateFlowchartNodes(
  content: HTMLElement,
  nodes: Pick<FlowchartNode, 'id' | 'label'>[],
  selectedElement: FlowchartSelection | null,
) {
  const svg = content.querySelector('svg');

  if (!svg) {
    return;
  }

  const nodeIds = nodes.map((node) => node.id);
  const candidates = Array.from(svg.querySelectorAll<Element>('.node, [id]'));

  candidates.forEach((candidate) => {
    candidate.removeAttribute('data-flowchart-node-id');
    candidate.classList.remove('preview-flowchart-node');
    candidate.classList.remove('is-selected');
  });

  nodes.forEach((node) => {
    const matched = candidates.find((candidate) => matchNodeIdFromElementId(candidate.id, nodeIds) === node.id);
    const target = matched?.closest('.node') ?? matched;

    if (!target) {
      return;
    }

    target.setAttribute('data-flowchart-node-id', node.id);
    target.setAttribute('role', 'button');
    target.setAttribute('tabindex', '0');
    target.setAttribute('aria-label', `Diagram node ${node.id}`);
    target.classList.add('preview-flowchart-node');

    if (selectedElement?.kind === 'node' && selectedElement.id === node.id) {
      target.classList.add('is-selected');
    }
  });
}

function annotateFlowchartEdges(
  content: HTMLElement,
  edges: Pick<FlowchartEdge, 'id' | 'from' | 'to' | 'label'>[],
  selectedElement: FlowchartSelection | null,
) {
  const svg = content.querySelector('svg');

  if (!svg) {
    return;
  }

  Array.from(svg.querySelectorAll('.preview-flowchart-edge-hit-area')).forEach((element) => element.remove());

  const candidates = Array.from(svg.querySelectorAll<Element>('.flowchart-link, .edgePath path'));

  candidates.forEach((candidate) => {
    candidate.removeAttribute('data-flowchart-edge-id');
    candidate.removeAttribute('role');
    candidate.removeAttribute('tabindex');
    candidate.removeAttribute('aria-label');
    candidate.classList.remove('preview-flowchart-edge');
    candidate.classList.remove('is-selected');
  });

  edges.forEach((edge, index) => {
    const idFragment = `-L_${edge.from}_${edge.to}_`;
    const target =
      candidates.find((candidate) => candidate.id.includes(idFragment) && !candidate.hasAttribute('data-flowchart-edge-id')) ??
      candidates[index];

    if (!target) {
      return;
    }

    target.setAttribute('data-flowchart-edge-id', edge.id);
    target.setAttribute('role', 'button');
    target.setAttribute('tabindex', '0');
    target.setAttribute(
      'aria-label',
      edge.label ? `Diagram edge ${edge.from} to ${edge.to}: ${edge.label}` : `Diagram edge ${edge.from} to ${edge.to}`,
    );
    target.classList.add('preview-flowchart-edge');

    const hitArea = target.cloneNode(false) as Element;

    hitArea.removeAttribute('id');
    hitArea.removeAttribute('class');
    hitArea.removeAttribute('role');
    hitArea.removeAttribute('tabindex');
    hitArea.removeAttribute('aria-label');
    hitArea.removeAttribute('marker-start');
    hitArea.removeAttribute('marker-mid');
    hitArea.removeAttribute('marker-end');
    hitArea.setAttribute('data-flowchart-edge-id', edge.id);
    hitArea.setAttribute('aria-hidden', 'true');
    hitArea.classList.add('preview-flowchart-edge-hit-area');
    target.parentNode?.insertBefore(hitArea, target.nextSibling);

    if (selectedElement?.kind === 'edge' && selectedElement.id === edge.id) {
      target.classList.add('is-selected');
      hitArea.classList.add('is-selected');
    }
  });
}

export function DiagramPreview({
  renderState,
  flowchartNodes = [],
  flowchartEdges = [],
  edgeDraft,
  edgeModeActive = false,
  selectionModeActive = false,
  selectedElement = null,
  onEdgeConnect,
  onEdgeDragStart,
  onEdgeNodeClick,
  onSelectElement,
}: DiagramPreviewProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null);
  const [pendingEdge, setPendingEdge] = useState<PendingEdgeDrag | null>(null);
  const [panMode, setPanMode] = useState(false);
  const [scale, setScale] = useState(1);
  const canTransform = renderState.status === 'success';
  const nodeIds = flowchartNodes.map((node) => node.id);
  const nodeIdsKey = nodeIds.join('\u0000');
  const edgeIds = flowchartEdges.map((edge) => edge.id);
  const edgeIdsKey = edgeIds.join('\u0000');
  const activeEdgeType = edgeDraft?.type ?? 'arrow';
  const activeEdgeLabel = edgeDraft?.label.trim() ?? '';

  useEffect(() => {
    const content = contentRef.current;

    if (!content || renderState.status !== 'success') {
      panzoomRef.current?.destroy();
      panzoomRef.current = null;
      setScale(1);
      return undefined;
    }

    const panzoom = Panzoom(content, {
      animate: true,
      cursor: edgeModeActive ? 'crosshair' : selectionModeActive ? 'pointer' : panMode ? 'grab' : 'default',
      disablePan: edgeModeActive || selectionModeActive || !panMode,
      maxScale: 4,
      minScale: 0.2,
      step: 0.18,
    });

    panzoomRef.current = panzoom;
    const handleChange = () => setScale(panzoom.getScale());
    content.addEventListener('panzoomchange', handleChange);

    return () => {
      content.removeEventListener('panzoomchange', handleChange);
      panzoom.destroy();
      if (panzoomRef.current === panzoom) {
        panzoomRef.current = null;
      }
    };
  }, [edgeModeActive, panMode, renderState, selectionModeActive]);

  useEffect(() => {
    const content = contentRef.current;

    if (renderState.status === 'success' && content) {
      annotateFlowchartNodes(content, flowchartNodes, selectedElement);
      annotateFlowchartEdges(content, flowchartEdges, selectedElement);
    }
  }, [edgeIdsKey, flowchartEdges, flowchartNodes, nodeIdsKey, renderState, selectedElement]);

  useEffect(() => {
    const surface = surfaceRef.current;
    const panzoom = panzoomRef.current;

    if (!surface || !panzoom || !panMode || edgeModeActive || selectionModeActive) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        return;
      }

      event.preventDefault();
      panzoom.zoomWithWheel(event);
    };

    surface.addEventListener('wheel', handleWheel, { passive: false });

    return () => surface.removeEventListener('wheel', handleWheel);
  }, [edgeModeActive, panMode, renderState.status, selectionModeActive]);

  const fitToScreen = useCallback(() => {
    const surface = surfaceRef.current;
    const content = contentRef.current;
    const panzoom = panzoomRef.current;

    if (!surface || !content || !panzoom) {
      return;
    }

    panzoom.reset({ animate: false });
    window.requestAnimationFrame(() => {
      const svg = content.querySelector('svg');
      const target = svg ?? content;
      const targetRect = target.getBoundingClientRect();
      const surfaceRect = surface.getBoundingClientRect();
      const availableWidth = Math.max(surfaceRect.width - 48, 1);
      const availableHeight = Math.max(surfaceRect.height - 48, 1);
      const nextScale = Math.min(
        2.5,
        Math.max(
          0.2,
          Math.min(availableWidth / targetRect.width, availableHeight / targetRect.height),
        ),
      );

      panzoom.zoom(nextScale, { animate: true });
      window.requestAnimationFrame(() => {
        const scaledRect = target.getBoundingClientRect();
        const x = (surfaceRect.width - scaledRect.width) / 2;
        const y = (surfaceRect.height - scaledRect.height) / 2;
        panzoom.pan(x, y, { animate: true, force: true });
        setScale(nextScale);
      });
    });
  }, []);

  const resetView = useCallback(() => {
    panzoomRef.current?.reset({ animate: true });
    setScale(1);
  }, []);

  const getSurfacePoint = useCallback((clientX: number, clientY: number): SurfacePoint | null => {
    const surface = surfaceRef.current;

    if (!surface) {
      return null;
    }

    const surfaceRect = surface.getBoundingClientRect();

    return {
      x: clientX - surfaceRect.left + surface.scrollLeft,
      y: clientY - surfaceRect.top + surface.scrollTop,
    };
  }, []);

  const getNodeCenter = useCallback((nodeId: string): SurfacePoint | null => {
    const content = contentRef.current;
    const surface = surfaceRef.current;

    if (!content || !surface) {
      return null;
    }

    const nodeElement = Array.from(content.querySelectorAll<Element>('[data-flowchart-node-id]')).find(
      (element) => element.getAttribute('data-flowchart-node-id') === nodeId,
    );

    if (!nodeElement) {
      return null;
    }

    const nodeRect = nodeElement.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();

    return {
      x: nodeRect.left + nodeRect.width / 2 - surfaceRect.left + surface.scrollLeft,
      y: nodeRect.top + nodeRect.height / 2 - surfaceRect.top + surface.scrollTop,
    };
  }, []);

  function handleEdgePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!edgeModeActive || event.button !== 0 || nodeIds.length === 0) {
      return;
    }

    const nodeId = findNodeIdFromElement(event.target, nodeIds);

    if (!nodeId) {
      return;
    }

    const point = getSurfacePoint(event.clientX, event.clientY);
    const start = getNodeCenter(nodeId) ?? point;

    if (!point || !start) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPendingEdge({
      from: nodeId,
      pointerId: event.pointerId,
      start,
      current: point,
      dragging: false,
    });
  }

  function handleSelectionPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!selectionModeActive || edgeModeActive || event.button !== 0) {
      return;
    }

    const nodeId = findNodeIdFromElement(event.target, nodeIds);

    if (nodeId) {
      event.preventDefault();
      onSelectElement?.({ kind: 'node', id: nodeId });
      return;
    }

    const edgeId = findEdgeIdFromElement(event.target, edgeIds);

    if (edgeId) {
      event.preventDefault();
      onSelectElement?.({ kind: 'edge', id: edgeId });
    }
  }

  function handleEdgePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pendingEdge || pendingEdge.pointerId !== event.pointerId) {
      return;
    }

    const point = getSurfacePoint(event.clientX, event.clientY);

    if (!point) {
      return;
    }

    const distance = Math.hypot(point.x - pendingEdge.start.x, point.y - pendingEdge.start.y);
    const dragging = pendingEdge.dragging || distance > 4;

    if (dragging && !pendingEdge.dragging) {
      onEdgeDragStart?.(pendingEdge.from);
    }

    setPendingEdge({
      ...pendingEdge,
      current: point,
      dragging,
    });
  }

  function handleEdgePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!pendingEdge || pendingEdge.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (pendingEdge.dragging) {
      const targetElement = document.elementFromPoint(event.clientX, event.clientY);
      const to = findNodeIdFromElement(targetElement, nodeIds);

      if (to && to !== pendingEdge.from) {
        onEdgeConnect?.(pendingEdge.from, to);
      }
    } else {
      onEdgeNodeClick?.(pendingEdge.from);
    }

    setPendingEdge(null);
  }

  function handleEdgePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (pendingEdge?.pointerId === event.pointerId) {
      setPendingEdge(null);
    }
  }

  return (
    <section className="preview-panel" aria-label="Diagram preview">
      <div className="preview-toolbar" aria-label="Preview controls">
        <button
          className={panMode ? 'icon-button is-active' : 'icon-button'}
          type="button"
          title="Pan mode"
          disabled={!canTransform}
          onClick={() => setPanMode((current) => !current)}
        >
          <Hand size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          title="Zoom in"
          disabled={!canTransform}
          onClick={() => panzoomRef.current?.zoomIn({ animate: true })}
        >
          <ZoomIn size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          title="Zoom out"
          disabled={!canTransform}
          onClick={() => panzoomRef.current?.zoomOut({ animate: true })}
        >
          <ZoomOut size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          title="Fit to screen"
          disabled={!canTransform}
          onClick={fitToScreen}
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          title="Reset view"
          disabled={!canTransform}
          onClick={resetView}
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
        <span className="zoom-readout">{Math.round(scale * 100)}%</span>
      </div>
      <div
        className={[
          'preview-surface',
          panMode && !edgeModeActive ? 'is-pannable' : '',
          edgeModeActive ? 'is-edge-mode' : '',
          selectionModeActive ? 'is-selection-mode' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        ref={surfaceRef}
        onPointerDownCapture={(event) => {
          handleSelectionPointerDown(event);
          handleEdgePointerDown(event);
        }}
        onPointerMoveCapture={handleEdgePointerMove}
        onPointerUpCapture={handleEdgePointerUp}
        onPointerCancelCapture={handleEdgePointerCancel}
      >
        {renderState.status === 'idle' ? (
          <div className="preview-empty">Idle</div>
        ) : null}
        {renderState.status === 'rendering' ? (
          <div className="preview-empty">Rendering</div>
        ) : null}
        {renderState.status === 'error' ? (
          <div className="preview-empty">Render error</div>
        ) : null}
        {renderState.status === 'success' ? (
          <div
            className="preview-svg"
            ref={contentRef}
            dangerouslySetInnerHTML={{ __html: renderState.svg }}
          />
        ) : null}
        {pendingEdge?.dragging ? (
          <svg className="preview-edge-overlay" aria-hidden="true">
            <defs>
              <marker
                id="preview-edge-arrow"
                markerHeight="7"
                markerWidth="7"
                orient="auto"
                refX="6"
                refY="3.5"
              >
                <path d="M0,0 L7,3.5 L0,7 Z" />
              </marker>
            </defs>
            <line
              className={`preview-edge-line preview-edge-line-${activeEdgeType}`}
              x1={pendingEdge.start.x}
              x2={pendingEdge.current.x}
              y1={pendingEdge.start.y}
              y2={pendingEdge.current.y}
              markerEnd={activeEdgeType === 'line' ? undefined : 'url(#preview-edge-arrow)'}
            />
            {activeEdgeLabel ? (
              <text
                className="preview-edge-label"
                x={(pendingEdge.start.x + pendingEdge.current.x) / 2}
                y={(pendingEdge.start.y + pendingEdge.current.y) / 2 - 8}
              >
                {activeEdgeLabel}
              </text>
            ) : null}
          </svg>
        ) : null}
      </div>
    </section>
  );
}
