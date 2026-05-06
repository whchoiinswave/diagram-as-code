import { GitBranch, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addFlowchartEdge,
  parseFlowchartStructure,
  updateFlowchartEdge,
  updateFlowchartNode,
  type FlowchartEdgeDraft,
  type FlowchartEdgeType,
  type FlowchartNodeShape,
  type FlowchartSelection,
} from '../../diagram/flowchart-structure';

type EditableShape = Exclude<FlowchartNodeShape, 'implicit'>;

type FlowchartStructurePanelProps = {
  source: string;
  edgeDraft?: FlowchartEdgeDraft;
  edgeModeActive?: boolean;
  focusEdgeSignal?: number;
  selectedElement?: FlowchartSelection | null;
  selectionModeActive?: boolean;
  onChangeSource: (source: string) => void;
  onConnectEdge?: (draft: FlowchartEdgeDraft) => void;
  onEdgeDraftChange?: (draft: FlowchartEdgeDraft) => void;
  onSelectElement?: (selection: FlowchartSelection) => void;
  onDeleteSelection?: (selection?: FlowchartSelection) => void;
};

const editableShapes: Array<{ value: EditableShape; label: string }> = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'round', label: 'Round' },
  { value: 'diamond', label: 'Decision' },
  { value: 'database', label: 'Database' },
  { value: 'circle', label: 'Circle' },
  { value: 'subroutine', label: 'Subroutine' },
];

const edgeTypes: Array<{ value: FlowchartEdgeType; label: string }> = [
  { value: 'arrow', label: 'Arrow' },
  { value: 'line', label: 'Line' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'thick', label: 'Thick' },
];

function toEditableShape(shape: FlowchartNodeShape): EditableShape {
  return shape === 'implicit' ? 'rectangle' : shape;
}

export function FlowchartStructurePanel({
  source,
  edgeDraft,
  edgeModeActive = false,
  focusEdgeSignal = 0,
  selectedElement = null,
  selectionModeActive = false,
  onChangeSource,
  onConnectEdge,
  onEdgeDraftChange,
  onSelectElement,
  onDeleteSelection,
}: FlowchartStructurePanelProps) {
  const structure = useMemo(() => parseFlowchartStructure(source), [source]);
  const nodeIdsKey = useMemo(() => structure.nodes.map((node) => node.id).join('\u0000'), [structure.nodes]);
  const edgeEditorRef = useRef<HTMLDivElement | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedEdge =
    selectedElement?.kind === 'edge'
      ? structure.edges.find((edge) => edge.id === selectedElement.id) ?? null
      : null;
  const effectiveSelectedNodeId = selectedElement?.kind === 'node' ? selectedElement.id : selectedNodeId;
  const selectedNode =
    selectedEdge === null
      ? structure.nodes.find((node) => node.id === effectiveSelectedNodeId) ?? structure.nodes[0] ?? null
      : null;
  const [label, setLabel] = useState(selectedNode?.label ?? '');
  const [shape, setShape] = useState<EditableShape>(toEditableShape(selectedNode?.shape ?? 'rectangle'));
  const [internalEdgeDraft, setInternalEdgeDraft] = useState<FlowchartEdgeDraft>({
    from: '',
    to: '',
    label: '',
    type: 'arrow',
  });
  const activeEdgeDraft = edgeDraft ?? internalEdgeDraft;
  const showEdgeConnectionEditor = structure.nodes.length >= 2 && (!selectionModeActive || edgeModeActive);
  const [selectedEdgeDraft, setSelectedEdgeDraft] = useState<FlowchartEdgeDraft>({
    from: selectedEdge?.from ?? '',
    to: selectedEdge?.to ?? '',
    label: selectedEdge?.label ?? '',
    type: selectedEdge?.type ?? 'arrow',
  });

  function commitEdgeDraft(nextDraft: FlowchartEdgeDraft) {
    if (edgeDraft) {
      onEdgeDraftChange?.(nextDraft);
      return;
    }

    setInternalEdgeDraft(nextDraft);
  }

  function patchEdgeDraft(patch: Partial<FlowchartEdgeDraft>) {
    commitEdgeDraft({ ...activeEdgeDraft, ...patch });
  }

  useEffect(() => {
    if (selectedElement?.kind === 'edge') {
      return;
    }

    if (selectedElement?.kind === 'node') {
      setSelectedNodeId(selectedElement.id);
      return;
    }

    if (!selectedNode && selectedNodeId !== null) {
      setSelectedNodeId(null);
      return;
    }

    if (!selectedNodeId && selectedNode) {
      setSelectedNodeId(selectedNode.id);
    }
  }, [selectedElement, selectedNode, selectedNodeId]);

  useEffect(() => {
    setLabel(selectedNode?.label ?? '');
    setShape(toEditableShape(selectedNode?.shape ?? 'rectangle'));
  }, [selectedNode?.id, selectedNode?.label, selectedNode?.shape]);

  useEffect(() => {
    setSelectedEdgeDraft({
      from: selectedEdge?.from ?? '',
      to: selectedEdge?.to ?? '',
      label: selectedEdge?.label ?? '',
      type: selectedEdge?.type ?? 'arrow',
    });
  }, [selectedEdge?.from, selectedEdge?.id, selectedEdge?.label, selectedEdge?.to, selectedEdge?.type]);

  useEffect(() => {
    if (!showEdgeConnectionEditor) {
      return;
    }

    const first = structure.nodes[0]?.id ?? '';
    const second = structure.nodes[1]?.id ?? first;
    const hasFrom = activeEdgeDraft.from && structure.nodes.some((node) => node.id === activeEdgeDraft.from);
    const hasTo = activeEdgeDraft.to && structure.nodes.some((node) => node.id === activeEdgeDraft.to);
    const nextDraft = {
      ...activeEdgeDraft,
      from: hasFrom ? activeEdgeDraft.from : first,
      to: hasTo ? activeEdgeDraft.to : second,
    };

    if (nextDraft.from !== activeEdgeDraft.from || nextDraft.to !== activeEdgeDraft.to) {
      commitEdgeDraft(nextDraft);
    }
  }, [activeEdgeDraft, nodeIdsKey, showEdgeConnectionEditor]);

  useEffect(() => {
    if (focusEdgeSignal > 0) {
      edgeEditorRef.current?.scrollIntoView?.({ block: 'nearest' });
      edgeEditorRef.current?.querySelector<HTMLSelectElement>('select')?.focus();
    }
  }, [focusEdgeSignal]);

  if (!structure.isFlowchart) {
    return null;
  }

  function updateSelectedNode(nextLabel: string, nextShape: EditableShape) {
    if (!selectedNode) {
      return;
    }

    onChangeSource(updateFlowchartNode(source, selectedNode.id, { label: nextLabel, shape: nextShape }));
  }

  function updateSelectedEdge(nextDraft: FlowchartEdgeDraft) {
    if (!selectedEdge) {
      return;
    }

    setSelectedEdgeDraft(nextDraft);

    if (!nextDraft.from || !nextDraft.to || nextDraft.from === nextDraft.to) {
      return;
    }

    onChangeSource(updateFlowchartEdge(source, selectedEdge.id, nextDraft));

    const nextEdgeId = `${selectedEdge.lineIndex}:${nextDraft.from}:${nextDraft.to}`;

    if (nextEdgeId !== selectedEdge.id) {
      onSelectElement?.({ kind: 'edge', id: nextEdgeId });
    }
  }

  function handleSelectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    onSelectElement?.({ kind: 'node', id: nodeId });
  }

  function handleSelectEdge(edgeId: string) {
    onSelectElement?.({ kind: 'edge', id: edgeId });
  }

  function handleAddEdge() {
    if (!activeEdgeDraft.from || !activeEdgeDraft.to) {
      return;
    }

    if (onConnectEdge) {
      onConnectEdge(activeEdgeDraft);
    } else {
      onChangeSource(addFlowchartEdge(source, activeEdgeDraft));
    }

    patchEdgeDraft({ label: '' });
  }

  return (
    <section className="structure-panel" aria-label="Flowchart structure">
      <div className="panel-title">Structure</div>
      <div className="structure-body">
        <div className="structure-node-list" aria-label="Flowchart nodes">
          {structure.nodes.map((node) => (
            <button
              key={node.id}
              className={node.id === selectedNode?.id ? 'structure-node is-selected' : 'structure-node'}
              type="button"
              aria-label={`${node.id} ${node.label}`}
              onClick={() => handleSelectNode(node.id)}
            >
              <span>{node.id}</span>
              <span>{node.label}</span>
            </button>
          ))}
        </div>

        {structure.edges.length > 0 ? (
          <div className="structure-edge-list" aria-label="Flowchart edges">
            {structure.edges.map((edge) => (
              <button
                key={edge.id}
                className={edge.id === selectedEdge?.id ? 'structure-edge is-selected' : 'structure-edge'}
                type="button"
                aria-label={edge.label ? `${edge.from} to ${edge.to}: ${edge.label}` : `${edge.from} to ${edge.to}`}
                onClick={() => handleSelectEdge(edge.id)}
              >
                <span>{edge.from}</span>
                <GitBranch size={13} aria-hidden="true" />
                <span>{edge.to}</span>
              </button>
            ))}
          </div>
        ) : null}

        {selectedNode ? (
          <div className="structure-editor">
            <label className="structure-field">
              <span>Label</span>
              <input
                className="structure-input"
                aria-label="Node label"
                value={label}
                onChange={(event) => {
                  const nextLabel = event.currentTarget.value;

                  setLabel(nextLabel);
                  updateSelectedNode(nextLabel, shape);
                }}
              />
            </label>
            <label className="structure-field">
              <span>Shape</span>
              <select
                className="structure-input"
                aria-label="Node shape"
                value={shape}
                onChange={(event) => {
                  const nextShape = event.currentTarget.value as EditableShape;

                  setShape(nextShape);
                  updateSelectedNode(label, nextShape);
                }}
              >
                {editableShapes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="structure-actions">
              <button
                className="small-button danger-button"
                type="button"
                title="Delete selected node"
                onClick={() => onDeleteSelection?.({ kind: 'node', id: selectedNode.id })}
              >
                <Trash2 size={14} aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>
        ) : null}

        {selectedEdge ? (
          <div
            className={selectionModeActive ? 'structure-selection-editor is-active' : 'structure-selection-editor'}
            aria-label="Selected edge"
          >
            <div className="structure-subtitle">Selected edge</div>
            <label className="structure-field">
              <span>From</span>
              <select
                className="structure-input"
                aria-label="Selected edge source"
                value={selectedEdgeDraft.from}
                onChange={(event) => {
                  const from = event.currentTarget.value;

                  updateSelectedEdge({ ...selectedEdgeDraft, from });
                }}
              >
                {structure.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="structure-field">
              <span>To</span>
              <select
                className="structure-input"
                aria-label="Selected edge target"
                value={selectedEdgeDraft.to}
                onChange={(event) => {
                  const to = event.currentTarget.value;

                  updateSelectedEdge({ ...selectedEdgeDraft, to });
                }}
              >
                {structure.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="structure-field">
              <span>Type</span>
              <select
                className="structure-input"
                aria-label="Selected edge type"
                value={selectedEdgeDraft.type}
                onChange={(event) => {
                  const type = event.currentTarget.value as FlowchartEdgeType;

                  updateSelectedEdge({ ...selectedEdgeDraft, type });
                }}
              >
                {edgeTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="structure-field">
              <span>Label</span>
              <input
                className="structure-input"
                aria-label="Selected edge label"
                value={selectedEdgeDraft.label}
                onChange={(event) => {
                  const nextLabel = event.currentTarget.value;

                  updateSelectedEdge({ ...selectedEdgeDraft, label: nextLabel });
                }}
              />
            </label>
            <div className="structure-actions">
              <button
                className="small-button danger-button"
                type="button"
                title="Delete selected edge"
                onClick={() => onDeleteSelection?.({ kind: 'edge', id: selectedEdge.id })}
              >
                <Trash2 size={14} aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>
        ) : null}

        {showEdgeConnectionEditor ? (
          <div
            ref={edgeEditorRef}
            className={edgeModeActive ? 'edge-editor is-active' : 'edge-editor'}
            aria-label="Edge editor"
          >
            <div className="structure-subtitle">Edge</div>
            <label className="structure-field">
              <span>From</span>
              <select
                className="structure-input"
                aria-label="Edge source"
                value={activeEdgeDraft.from}
                onChange={(event) => patchEdgeDraft({ from: event.currentTarget.value })}
              >
                {structure.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="structure-field">
              <span>To</span>
              <select
                className="structure-input"
                aria-label="Edge target"
                value={activeEdgeDraft.to}
                onChange={(event) => patchEdgeDraft({ to: event.currentTarget.value })}
              >
                {structure.nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="structure-field">
              <span>Type</span>
              <select
                className="structure-input"
                aria-label="Edge type"
                value={activeEdgeDraft.type}
                onChange={(event) => patchEdgeDraft({ type: event.currentTarget.value as FlowchartEdgeType })}
              >
                {edgeTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="structure-field">
              <span>Label</span>
              <input
                className="structure-input"
                aria-label="Edge label"
                value={activeEdgeDraft.label}
                onChange={(event) => patchEdgeDraft({ label: event.currentTarget.value })}
              />
            </label>
            <button
              className="small-button"
              type="button"
              title="Connect edge"
              disabled={!activeEdgeDraft.from || !activeEdgeDraft.to || activeEdgeDraft.from === activeEdgeDraft.to}
              onClick={handleAddEdge}
            >
              <GitBranch size={14} aria-hidden="true" />
              Connect
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
