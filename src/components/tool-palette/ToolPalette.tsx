import { CSS } from '@dnd-kit/utilities';
import { useDraggable } from '@dnd-kit/core';
import { Circle, Database, Diamond, GitBranch, MousePointer2, Square, StretchHorizontal, Workflow } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { createFlowchartNodeSnippet, parseFlowchartStructure } from '../../diagram/flowchart-structure';

type ToolPaletteProps = {
  source: string;
  activeToolId?: ToolId | null;
  onInsertSnippet: (snippet: string) => void;
  onOpenEdgeSettings?: () => void;
  onSelectMode?: () => void;
};

const tools = [
  {
    id: 'select',
    title: 'Select',
    icon: MousePointer2,
  },
  {
    id: 'rectangle',
    title: 'Rectangle',
    icon: Square,
  },
  {
    id: 'round',
    title: 'Round',
    icon: StretchHorizontal,
  },
  {
    id: 'edge',
    title: 'Edge',
    icon: GitBranch,
  },
  {
    id: 'decision',
    title: 'Decision',
    icon: Diamond,
  },
  {
    id: 'database',
    title: 'Database',
    icon: Database,
  },
  {
    id: 'circle',
    title: 'Circle',
    icon: Circle,
  },
  {
    id: 'subroutine',
    title: 'Subroutine',
    icon: Workflow,
  },
] as const;

type Tool = (typeof tools)[number];
type ToolId = Tool['id'];
type MermaidShape = 'flowchart' | 'sequence' | 'er' | 'class' | 'state' | 'unknown';
type TooltipState = {
  label: string;
  side: 'left' | 'right';
  x: number;
  y: number;
};

export function detectMermaidShape(source: string): MermaidShape {
  const firstMeaningfulLine = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('%%'));

  if (!firstMeaningfulLine) {
    return 'unknown';
  }

  if (/^(flowchart|graph)\b/.test(firstMeaningfulLine)) {
    return 'flowchart';
  }

  if (/^sequenceDiagram\b/.test(firstMeaningfulLine)) {
    return 'sequence';
  }

  if (/^erDiagram\b/.test(firstMeaningfulLine)) {
    return 'er';
  }

  if (/^classDiagram\b/.test(firstMeaningfulLine)) {
    return 'class';
  }

  if (/^stateDiagram/.test(firstMeaningfulLine)) {
    return 'state';
  }

  return 'unknown';
}

export function getToolSnippet(toolId: ToolId, source: string): string {
  const shape = detectMermaidShape(source);

  if (shape === 'flowchart') {
    if (toolId === 'select') {
      return '';
    }

    if (toolId === 'edge') {
      const nodes = parseFlowchartStructure(source).nodes;
      const [from, to] = nodes;

      return from && to ? `\n  ${from.id} --> ${to.id}` : '\n  Source --> Target';
    }

    const shapeByTool = toolId as Exclude<ToolId, 'select' | 'edge'>;
    const nodeShape = shapeByTool === 'decision' ? 'diamond' : shapeByTool;

    return createFlowchartNodeSnippet(source, { shape: nodeShape });
  }

  if (shape === 'sequence') {
    const snippets: Record<ToolId, string> = {
      select: '',
      rectangle: '\n  participant NewParticipant',
      round: '\n  participant Step',
      edge: '\n  Source->>Target: Message',
      decision: '\n  alt Decision\n    User->>Editor: Yes\n  else No\n    User->>Editor: No\n  end',
      database: '\n  participant Store',
      circle: '\n  participant State',
      subroutine: '\n  participant Process',
    };

    return snippets[toolId];
  }

  if (shape === 'er') {
    const snippets: Record<ToolId, string> = {
      select: '',
      rectangle: '\n  NEW_ENTITY {\n    string id\n  }',
      round: '\n  STEP {\n    string id\n  }',
      edge: '\n  CUSTOMER ||--o{ ORDER : places',
      decision: '\n  REVIEW {\n    string status\n    string reason\n  }',
      database: '\n  STORE {\n    string id\n    string name\n  }',
      circle: '\n  STATE {\n    string id\n  }',
      subroutine: '\n  PROCESS {\n    string id\n  }',
    };

    return snippets[toolId];
  }

  if (shape === 'class') {
    const snippets: Record<ToolId, string> = {
      select: '',
      rectangle: '\n  class NewClass',
      round: '\n  class Step',
      edge: '\n  Source --> Target',
      decision: '\n  class Decision {\n    +boolean approved\n  }',
      database: '\n  class Store {\n    +string id\n    +string name\n  }',
      circle: '\n  class State',
      subroutine: '\n  class Process',
    };

    return snippets[toolId];
  }

  if (shape === 'state') {
    const snippets: Record<ToolId, string> = {
      select: '',
      rectangle: '\n  NewState: New state',
      round: '\n  Step: Step',
      edge: '\n  Source --> Target',
      decision: '\n  Choice <<choice>>\n  [*] --> Choice\n  Choice --> Next: yes\n  Choice --> Back: no',
      database: '\n  Store: Data store',
      circle: '\n  State: State',
      subroutine: '\n  Process: Process',
    };

    return snippets[toolId];
  }

  const flowchartSnippets: Record<ToolId, string> = {
    select: '',
    rectangle: '\n  NewNode[New node]',
    round: '\n  Step(Step)',
    edge: '\n  Source --> Target',
    decision: '\n  Decision{Decision?}',
    database: '\n  Store[(Data store)]',
    circle: '\n  State((State))',
    subroutine: '\n  Process[[Process]]',
  };

  return flowchartSnippets[toolId];
}

function ToolButton({
  tool,
  source,
  isActive,
  onInsertSnippet,
  onOpenEdgeSettings,
  onSelectMode,
}: {
  tool: Tool;
  source: string;
  isActive?: boolean;
  onInsertSnippet: (snippet: string) => void;
  onOpenEdgeSettings?: () => void;
  onSelectMode?: () => void;
}) {
  const snippet = getToolSnippet(tool.id, source);
  const opensSelectMode = tool.id === 'select';
  const opensFlowchartEdgeSettings = detectMermaidShape(source) === 'flowchart' && tool.id === 'edge';
  const label = `${tool.title} - click or drag`;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tool-${tool.id}`,
    data: {
      snippet,
      title: tool.title,
    },
  });
  const Icon = tool.icon;
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  function showTooltip(element: HTMLButtonElement) {
    const rect = element.getBoundingClientRect();
    const side = rect.left > 180 ? 'left' : 'right';

    setTooltip({
      label,
      side,
      x: side === 'left' ? rect.left - 8 : rect.right + 8,
      y: Math.min(window.innerHeight - 12, Math.max(12, rect.top + rect.height / 2)),
    });
  }

  function hideTooltip() {
    setTooltip(null);
  }

  return (
    <>
      <button
        ref={setNodeRef}
        className={['tool-button', isDragging ? 'is-dragging' : '', isActive ? 'is-active' : '']
          .filter(Boolean)
          .join(' ')}
        type="button"
        title={label}
        aria-label={label}
        data-tooltip={label}
        style={style}
        {...listeners}
        {...attributes}
        onPointerEnter={(event) => showTooltip(event.currentTarget)}
        onPointerLeave={hideTooltip}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={hideTooltip}
        onClick={() => {
          hideTooltip();

          if (opensSelectMode) {
            onSelectMode?.();
            return;
          }

          if (opensFlowchartEdgeSettings && onOpenEdgeSettings) {
            onOpenEdgeSettings();
            return;
          }

          onInsertSnippet(snippet);
        }}
      >
        <Icon size={17} aria-hidden="true" />
      </button>
      {tooltip
        ? createPortal(
            <div
              className={`tool-tooltip tool-tooltip-${tooltip.side}`}
              role="tooltip"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              {tooltip.label}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function ToolPalette({
  source,
  activeToolId = null,
  onInsertSnippet,
  onOpenEdgeSettings,
  onSelectMode,
}: ToolPaletteProps) {
  return (
    <section className="tool-palette" aria-label="Tool palette">
      <div className="panel-title">Tools</div>
      <div className="tool-grid">
        {tools.map((tool) => (
          <ToolButton
            key={tool.id}
            tool={tool}
            source={source}
            isActive={activeToolId === tool.id}
            onInsertSnippet={onInsertSnippet}
            onOpenEdgeSettings={onOpenEdgeSettings}
            onSelectMode={onSelectMode}
          />
        ))}
      </div>
    </section>
  );
}
