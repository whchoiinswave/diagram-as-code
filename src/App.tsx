import {
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import type { Extension } from '@codemirror/state';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { applyAiProposal, createMockAiProposal, type AiProposal } from './ai/proposal';
import { createPresenceUser } from './collaboration/awareness';
import { createYjsCodeMirrorExtension } from './collaboration/codemirror';
import { createIndexedDbPersistence } from './collaboration/indexeddb';
import { createCollaborationProvider } from './collaboration/provider';
import { isCollaborationMode, resolveRoomId } from './collaboration/room';
import { createCollaborationDocument, replaceSharedSource, type CollaborationDocument } from './collaboration/ydoc';
import { CollaborationPanel } from './components/collaboration/CollaborationPanel';
import { DiagnosticsPanel } from './components/diagnostics/DiagnosticsPanel';
import { CodeEditor } from './components/editor/CodeEditor';
import { WorkspaceShell } from './components/explorer/WorkspaceShell';
import { ProposalPanel } from './components/ai/ProposalPanel';
import { DiagramPreview } from './components/preview/DiagramPreview';
import { FlowchartStructurePanel } from './components/structure/FlowchartStructurePanel';
import { ToolPalette } from './components/tool-palette/ToolPalette';
import { TopToolbar } from './components/toolbar/TopToolbar';
import { mermaidDialect } from './diagram/dialects/mermaid/mermaidDialect';
import { extractFirstDiagramBlock, toMarkdownFence } from './diagram/markdown';
import { renderDiagram } from './diagram/render-state';
import { defaultMermaidSource, mermaidTemplates } from './diagram/templates/mermaidTemplates';
import {
  addFlowchartEdge,
  deleteFlowchartEdge,
  deleteFlowchartNode,
  parseFlowchartStructure,
  type FlowchartEdgeDraft,
  type FlowchartSelection,
} from './diagram/flowchart-structure';
import type { DiagramTarget, RenderState } from './diagram/types';
import { downloadTextFile } from './utils/download';
import { parseLaunchContext } from './app/launch/launch-context';
import { createServerStorageProvider } from './workspace/server-provider';
import { createSampleWorkspaceProvider } from './workspace/sample-workspace';
import { createProviderFromFiles, type DiagramFile, type StorageProvider } from './workspace/storage-provider';
import { getAdjacentFile } from './workspace/tree';

const draftKey = 'diagram-as-code:draft';
const sourceDropTargets = new Set(['editor-source-drop', 'preview-source-drop']);
type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';
type TargetStatus = 'current' | 'stale';
type EdgePickRole = 'from' | 'to';

const initialEdgeDraft: FlowchartEdgeDraft = {
  from: '',
  to: '',
  label: '',
  type: 'arrow',
};

function readInitialSource(): string {
  const saved = window.localStorage.getItem(draftKey);
  return saved ?? defaultMermaidSource;
}

function toFileTarget(file: DiagramFile): DiagramTarget {
  return {
    kind: 'file',
    uri: file.uri,
    dialect: file.dialectHint ?? 'mermaid',
  };
}

function toFileFromTarget(target: DiagramTarget): DiagramFile {
  const relativePath = target.uri.replace(/^server:\/\//, '');

  return {
    uri: target.uri,
    name: relativePath.split('/').slice(-1)[0] ?? relativePath,
    relativePath,
    dialectHint: target.dialect,
    kind: 'file',
  };
}

function SourceDropZone({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={isOver ? `${className} is-drop-target` : className}
      role="region"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [launchContext] = useState(() => parseLaunchContext(window.location.href));
  const collaborationEnabled = useMemo(() => isCollaborationMode(launchContext), [launchContext]);
  const collaborationRoomId = useMemo(() => resolveRoomId(launchContext), [launchContext]);
  const [presenceUser] = useState(() => createPresenceUser('Local user'));
  const [provider, setProvider] = useState<StorageProvider>(() =>
    launchContext.rootUri ? createServerStorageProvider(launchContext.rootUri) : createSampleWorkspaceProvider(),
  );
  const [files, setFiles] = useState<DiagramFile[]>([]);
  const [rootInput, setRootInput] = useState(launchContext.rootUri ?? 'sample://');
  const [activeFile, setActiveFile] = useState<DiagramFile | null>(null);
  const [activeTarget, setActiveTarget] = useState<DiagramTarget | null>(null);
  const [source, setSource] = useState(readInitialSource);
  const [renderState, setRenderState] = useState<RenderState>({ status: 'idle' });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [targetStatus, setTargetStatus] = useState<TargetStatus>('current');
  const [collaborationStatus, setCollaborationStatus] = useState('offline');
  const [collaborationExtensions, setCollaborationExtensions] = useState<Extension[]>([]);
  const [activeProposal, setActiveProposal] = useState<AiProposal | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(mermaidTemplates[0].id);
  const [edgeDraft, setEdgeDraft] = useState<FlowchartEdgeDraft>(initialEdgeDraft);
  const [edgeModeActive, setEdgeModeActive] = useState(false);
  const [selectionModeActive, setSelectionModeActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<FlowchartSelection | null>(null);
  const [edgePickRole, setEdgePickRole] = useState<EdgePickRole>('from');
  const [edgeSettingsSignal, setEdgeSettingsSignal] = useState(0);
  const templates = useMemo(() => mermaidDialect.templates, []);
  const flowchartStructure = useMemo(() => parseFlowchartStructure(source), [source]);
  const flowchartNodeIdsKey = useMemo(
    () => flowchartStructure.nodes.map((node) => node.id).join('\u0000'),
    [flowchartStructure.nodes],
  );
  const sourceRef = useRef(source);
  const pendingCollaborationSourceRef = useRef('');
  const collaborationHandshakeRef = useRef(false);
  const collaborationEditorReadyRef = useRef(false);
  const activateCollaborationRef = useRef<() => void>(() => undefined);
  const collaborationDocumentRef = useRef<CollaborationDocument | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    if (!flowchartStructure.isFlowchart) {
      setEdgeModeActive(false);
      setSelectionModeActive(false);
      setSelectedElement(null);
      return;
    }

    const first = flowchartStructure.nodes[0]?.id ?? '';
    const second = flowchartStructure.nodes[1]?.id ?? first;

    setEdgeDraft((current) => {
      const hasFrom = current.from && flowchartStructure.nodes.some((node) => node.id === current.from);
      const hasTo = current.to && flowchartStructure.nodes.some((node) => node.id === current.to);
      const nextDraft = {
        ...current,
        from: hasFrom ? current.from : first,
        to: hasTo ? current.to : second,
      };

      return nextDraft.from === current.from && nextDraft.to === current.to ? current : nextDraft;
    });

    setSelectedElement((current) => {
      if (!current) {
        return current;
      }

      if (current.kind === 'node') {
        return flowchartStructure.nodes.some((node) => node.id === current.id) ? current : null;
      }

      return flowchartStructure.edges.some((edge) => edge.id === current.id) ? current : null;
    });
  }, [flowchartNodeIdsKey, flowchartStructure.edges, flowchartStructure.isFlowchart, flowchartStructure.nodes]);

  useEffect(() => {
    if (!collaborationEnabled) {
      collaborationDocumentRef.current = null;
      pendingCollaborationSourceRef.current = '';
      collaborationHandshakeRef.current = false;
      collaborationEditorReadyRef.current = false;
      activateCollaborationRef.current = () => undefined;
      setCollaborationExtensions([]);
      setCollaborationStatus('offline');
      return undefined;
    }

    const document = createCollaborationDocument(collaborationRoomId);
    const providerUrl = import.meta.env.VITE_HOCUSPOCUS_URL ?? 'ws://localhost:1234';
    const provider = createCollaborationProvider({
      url: providerUrl,
      roomId: collaborationRoomId,
      document: document.doc,
    });
    const persistence = createIndexedDbPersistence(collaborationRoomId, document.doc);

    collaborationDocumentRef.current = document;
    provider.setAwarenessField('user', presenceUser);
    setCollaborationStatus('connecting');

    const activateCollaborationSource = () => {
      collaborationHandshakeRef.current = true;

      if (document.source.length === 0 && pendingCollaborationSourceRef.current) {
        replaceSharedSource(document.source, pendingCollaborationSourceRef.current);
      }

      const sharedSource = document.source.toString();

      if (sharedSource) {
        sourceRef.current = sharedSource;
        window.localStorage.setItem(draftKey, sharedSource);
        setSource((currentSource) => (currentSource === sharedSource ? currentSource : sharedSource));
      }

      if (!collaborationEditorReadyRef.current) {
        collaborationEditorReadyRef.current = true;
        setCollaborationExtensions([
          createYjsCodeMirrorExtension(document.source, provider.awareness, document.undoManager),
        ]);
      }

      setCollaborationStatus('synced');
    };

    const handleStatus = ({ status }: { status: string }) => setCollaborationStatus(status);
    const handleSynced = () => activateCollaborationSource();
    const handleSourceChange = () => {
      const nextSource = document.source.toString();
      sourceRef.current = nextSource;
      window.localStorage.setItem(draftKey, nextSource);
      setSource((currentSource) => (currentSource === nextSource ? currentSource : nextSource));
      setSaveStatus('dirty');
    };

    provider.on('status', handleStatus);
    provider.on('synced', handleSynced);
    document.source.observe(handleSourceChange);

    activateCollaborationRef.current = activateCollaborationSource;
    if (provider.synced) {
      activateCollaborationSource();
    }

    return () => {
      document.source.unobserve(handleSourceChange);
      provider.off('status', handleStatus);
      provider.off('synced', handleSynced);
      provider.destroy();
      void persistence.destroy();
      document.doc.destroy();
      collaborationDocumentRef.current = null;
      pendingCollaborationSourceRef.current = '';
      collaborationHandshakeRef.current = false;
      collaborationEditorReadyRef.current = false;
      activateCollaborationRef.current = () => undefined;
    };
  }, [collaborationEnabled, collaborationRoomId, presenceUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      const nextFiles = await provider.listFiles(rootInput);

      if (cancelled) {
        return;
      }

      setFiles(nextFiles);
      setActiveProposal(null);
      setProposalError(null);

      const launchedFile = launchContext.target
        ? nextFiles.find((file) => file.uri === launchContext.target?.uri) ?? toFileFromTarget(launchContext.target)
        : null;
      const nextActive = launchedFile ?? nextFiles[0] ?? null;
      setActiveFile(nextActive);
      setActiveTarget(launchContext.target ?? (nextActive ? toFileTarget(nextActive) : null));

      if (nextActive) {
        const nextTarget = launchContext.target ?? toFileTarget(nextActive);
        const targetState = await readTargetState(nextTarget);

        if (!cancelled) {
          applyTargetState(nextTarget, targetState);
          loadSource(targetState.source);
          setSaveStatus('saved');
        }
      }
    }

    void loadWorkspace().catch(() => {
      if (!cancelled) {
        setFiles([]);
        setActiveFile(null);
        setTargetStatus('current');
        setSaveStatus('error');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [provider, rootInput]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setRenderState({ status: 'rendering' });
      void renderDiagram(mermaidDialect, source).then((state) => {
        if (!cancelled) {
          setRenderState(state);
        }
      });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source]);

  function syncCollaborationSource(nextSource: string) {
    const document = collaborationDocumentRef.current;

    if (document && document.source.toString() !== nextSource) {
      replaceSharedSource(document.source, nextSource);
    }
  }

  function updateSource(nextSource: string) {
    syncCollaborationSource(nextSource);
    setSource(nextSource);
    window.localStorage.setItem(draftKey, nextSource);
    setSaveStatus('dirty');
  }

  function loadSource(nextSource: string) {
    if (collaborationEnabled) {
      pendingCollaborationSourceRef.current = nextSource;

      if (collaborationHandshakeRef.current) {
        activateCollaborationRef.current();
        return;
      }

      sourceRef.current = nextSource;
      setSource(nextSource);
      window.localStorage.setItem(draftKey, nextSource);
      return;
    }

    syncCollaborationSource(nextSource);
    setSource(nextSource);
    window.localStorage.setItem(draftKey, nextSource);
  }

  async function readTargetState(target: DiagramTarget) {
    return provider.readTargetState
      ? await provider.readTargetState(target)
      : { source: await provider.readTarget(target), stale: false };
  }

  function applyTargetState(target: DiagramTarget, state: Awaited<ReturnType<typeof readTargetState>>) {
    if (target.kind === 'markdown-block' && state.sourceHash) {
      setActiveTarget({ ...target, sourceHash: state.sourceHash });
    }

    setTargetStatus(state.stale ? 'stale' : 'current');
  }

  function handleTemplateChange(templateId: string) {
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setSelectedTemplateId(template.id);
    updateSource(template.source);
  }

  function handleExportSvg() {
    if (renderState.status !== 'success') {
      return;
    }

    downloadTextFile('diagram.svg', renderState.svg, 'image/svg+xml;charset=utf-8');
  }

  function handleExportMarkdown() {
    downloadTextFile('diagram.md', toMarkdownFence(source), 'text/markdown;charset=utf-8');
  }

  function handleImportMarkdown(file: File) {
    void file.text().then((text) => {
      const block = extractFirstDiagramBlock(text);
      updateSource(block?.source ?? text);
    });
  }

  async function handleSelectFile(file: DiagramFile) {
    const target = toFileTarget(file);
    setActiveFile(file);
    setActiveTarget(target);
    const targetState = await readTargetState(target);
    applyTargetState(target, targetState);
    loadSource(targetState.source);
    setSaveStatus('saved');
    setActiveProposal(null);
    setProposalError(null);
  }

  function handleSourceChange(nextSource: string) {
    updateSource(nextSource);
  }

  async function handleImportFiles(fileList: FileList) {
    const nextProvider = await createProviderFromFiles(fileList);
    setRootInput('browser://imported');
    setProvider(nextProvider);
  }

  function handleLoadSample() {
    setRootInput('sample://');
    setProvider(createSampleWorkspaceProvider());
  }

  async function handleNavigate(direction: 'previous' | 'next') {
    const adjacent = getAdjacentFile(files, activeFile?.uri ?? null, direction);

    if (adjacent) {
      await handleSelectFile(adjacent);
    }
  }

  async function handleSave() {
    if (!activeTarget) {
      return;
    }

    setSaveStatus('saving');

    try {
      const state = await provider.writeTarget(activeTarget, source);

      if (activeTarget.kind === 'markdown-block' && state?.sourceHash) {
        setActiveTarget({ ...activeTarget, sourceHash: state.sourceHash });
      }

      setTargetStatus('current');
      setSaveStatus('saved');
    } catch {
      if (activeTarget.kind === 'markdown-block') {
        setTargetStatus('stale');
      }

      setSaveStatus('error');
    }
  }

  function handleInsertSnippet(snippet: string) {
    setSelectionModeActive(false);
    setSelectedElement(null);
    updateSource(`${source.trimEnd()}${snippet}\n`);
  }

  function handleSelectMode() {
    setSelectionModeActive(true);
    setEdgeModeActive(false);
  }

  function handleSelectElement(selection: FlowchartSelection) {
    setSelectionModeActive(true);
    setEdgeModeActive(false);
    setSelectedElement(selection);
  }

  function handleDeleteSelection(selection = selectedElement) {
    if (!selection) {
      return;
    }

    const nextSource =
      selection.kind === 'node'
        ? deleteFlowchartNode(sourceRef.current, selection.id)
        : deleteFlowchartEdge(sourceRef.current, selection.id);

    setSelectedElement(null);
    updateSource(nextSource);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        !selectedElement ||
        target?.closest('input, textarea, select, [contenteditable="true"]') ||
        (event.key !== 'Delete' && event.key !== 'Backspace')
      ) {
        return;
      }

      event.preventDefault();
      handleDeleteSelection();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement]);

  function handleOpenEdgeSettings() {
    setEdgeModeActive(true);
    setSelectionModeActive(false);
    setSelectedElement(null);
    setEdgePickRole('from');
    setEdgeSettingsSignal((value) => value + 1);
  }

  function connectFlowchartEdge(draft: FlowchartEdgeDraft) {
    if (!draft.from || !draft.to || draft.from === draft.to) {
      return;
    }

    updateSource(addFlowchartEdge(sourceRef.current, draft));
    setEdgeDraft({ ...draft, label: '' });
  }

  function handleEdgeDraftChange(nextDraft: FlowchartEdgeDraft) {
    setEdgeModeActive(true);
    setSelectionModeActive(false);
    setSelectedElement(null);
    setEdgeDraft(nextDraft);
  }

  function handlePreviewEdgeNodeClick(nodeId: string) {
    setEdgeModeActive(true);
    setSelectionModeActive(false);
    setSelectedElement(null);
    setEdgeSettingsSignal((value) => value + 1);

    if (edgePickRole === 'from' || !edgeDraft.from) {
      setEdgeDraft((current) => ({
        ...current,
        from: nodeId,
        to: current.to === nodeId ? '' : current.to,
      }));
      setEdgePickRole('to');
      return;
    }

    const nextDraft = { ...edgeDraft, to: nodeId };
    setEdgeDraft(nextDraft);

    if (edgeDraft.from !== nodeId) {
      connectFlowchartEdge(nextDraft);
      setEdgePickRole('from');
    }
  }

  function handlePreviewEdgeDragStart(from: string) {
    setEdgeModeActive(true);
    setSelectionModeActive(false);
    setSelectedElement(null);
    setEdgeSettingsSignal((value) => value + 1);
    setEdgePickRole('to');
    setEdgeDraft((current) => ({
      ...current,
      from,
      to: current.to === from ? '' : current.to,
    }));
  }

  function handlePreviewEdgeConnect(from: string, to: string) {
    const nextDraft = { ...edgeDraft, from, to };

    setEdgeModeActive(true);
    setSelectionModeActive(false);
    setSelectedElement(null);
    setEdgeSettingsSignal((value) => value + 1);
    setEdgeDraft(nextDraft);
    connectFlowchartEdge(nextDraft);
    setEdgePickRole('from');
  }

  function handleCreateProposal() {
    setActiveProposal(createMockAiProposal(source, activeFile?.relativePath ?? 'diagram.mmd'));
    setProposalError(null);
  }

  function handleApplyProposal() {
    if (!activeProposal) {
      return;
    }

    const result = applyAiProposal(activeProposal, source);

    if (!result.ok) {
      setProposalError('Proposal no longer applies to the current source.');
      return;
    }

    updateSource(result.source);
    setActiveProposal(null);
    setProposalError(null);
  }

  function handleCancelProposal() {
    setActiveProposal(null);
    setProposalError(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id ? String(event.over.id) : null;
    const snippet = event.active.data.current?.snippet;

    if (overId && sourceDropTargets.has(overId) && typeof snippet === 'string' && snippet.trim()) {
      handleInsertSnippet(snippet);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToWindowEdges]}
      onDragEnd={handleDragEnd}
    >
      <div className="app-shell">
        <TopToolbar
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          renderState={renderState}
          saveStatus={saveStatus}
          onTemplateChange={handleTemplateChange}
          onExportSvg={handleExportSvg}
          onExportMarkdown={handleExportMarkdown}
          onImportMarkdown={handleImportMarkdown}
          onSave={handleSave}
        />

        <main className="workbench">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={19} minSize={15} maxSize={28}>
              <WorkspaceShell
                files={files}
                activeUri={activeFile?.uri ?? null}
                rootLabel={provider.label}
                rootInput={rootInput}
                saveStatus={saveStatus}
                onRootInputChange={setRootInput}
                onLoadSample={handleLoadSample}
                onImportFiles={handleImportFiles}
                onSelectFile={handleSelectFile}
                onNavigate={handleNavigate}
                onSave={handleSave}
              />
            </Panel>
            <PanelResizeHandle className="resize-handle" />
            <Panel minSize={45}>
              <PanelGroup direction="horizontal">
                <Panel defaultSize={48} minSize={32}>
                  <SourceDropZone
                    id="editor-source-drop"
                    label="Source editor drop target"
                    className="editor-panel"
                  >
                    <div className="panel-title panel-title-with-status">
                      <span>{activeFile?.relativePath ?? 'untitled'}</span>
                      {targetStatus === 'stale' ? (
                        <span className="target-status target-status-stale">stale</span>
                      ) : null}
                    </div>
                    <CodeEditor
                      value={source}
                      onChange={handleSourceChange}
                      extensions={collaborationExtensions}
                    />
                  </SourceDropZone>
                </Panel>
                <PanelResizeHandle className="resize-handle" />
                <Panel defaultSize={52} minSize={34}>
                  <SourceDropZone
                    id="preview-source-drop"
                    label="Preview drop target"
                    className="preview-drop-host"
                  >
                    <DiagramPreview
                      renderState={renderState}
                      flowchartNodes={flowchartStructure.isFlowchart ? flowchartStructure.nodes : []}
                      flowchartEdges={flowchartStructure.isFlowchart ? flowchartStructure.edges : []}
                      edgeDraft={edgeDraft}
                      edgeModeActive={edgeModeActive && flowchartStructure.isFlowchart}
                      selectionModeActive={selectionModeActive && flowchartStructure.isFlowchart}
                      selectedElement={selectedElement}
                      onEdgeConnect={handlePreviewEdgeConnect}
                      onEdgeDragStart={handlePreviewEdgeDragStart}
                      onEdgeNodeClick={handlePreviewEdgeNodeClick}
                      onSelectElement={handleSelectElement}
                    />
                  </SourceDropZone>
                </Panel>
              </PanelGroup>
            </Panel>
            <PanelResizeHandle className="resize-handle" />
            <Panel defaultSize={17} minSize={13} maxSize={24}>
              <aside className="right-rail">
                <ToolPalette
                  source={source}
                  activeToolId={
                    selectionModeActive && flowchartStructure.isFlowchart
                      ? 'select'
                      : edgeModeActive && flowchartStructure.isFlowchart
                        ? 'edge'
                        : null
                  }
                  onInsertSnippet={handleInsertSnippet}
                  onOpenEdgeSettings={handleOpenEdgeSettings}
                  onSelectMode={handleSelectMode}
                />
                <FlowchartStructurePanel
                  source={source}
                  edgeDraft={edgeDraft}
                  edgeModeActive={edgeModeActive && flowchartStructure.isFlowchart}
                  focusEdgeSignal={edgeSettingsSignal}
                  selectedElement={selectedElement}
                  selectionModeActive={selectionModeActive && flowchartStructure.isFlowchart}
                  onChangeSource={updateSource}
                  onConnectEdge={connectFlowchartEdge}
                  onEdgeDraftChange={handleEdgeDraftChange}
                  onSelectElement={handleSelectElement}
                  onDeleteSelection={handleDeleteSelection}
                />
                {collaborationEnabled ? (
                  <CollaborationPanel
                    roomId={collaborationRoomId}
                    status={collaborationStatus}
                    user={presenceUser}
                  />
                ) : null}
                <ProposalPanel
                  proposal={activeProposal}
                  error={proposalError}
                  onCreateProposal={handleCreateProposal}
                  onApplyProposal={handleApplyProposal}
                  onCancelProposal={handleCancelProposal}
                />
                <DiagnosticsPanel renderState={renderState} />
              </aside>
            </Panel>
          </PanelGroup>
        </main>
      </div>
    </DndContext>
  );
}
