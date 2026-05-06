import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { detectMermaidShape, getToolSnippet, ToolPalette } from '../components/tool-palette/ToolPalette';
import { defaultMermaidSource } from '../diagram/templates/mermaidTemplates';

function TestDndContext({ children }: { children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  return <DndContext sensors={sensors}>{children}</DndContext>;
}

describe('ToolPalette', () => {
  it('inserts a snippet when a tool is clicked', async () => {
    const user = userEvent.setup();
    const onInsertSnippet = vi.fn();

    render(
      <TestDndContext>
        <ToolPalette source="flowchart LR" onInsertSnippet={onInsertSnippet} />
      </TestDndContext>,
    );

    await user.click(screen.getByTitle('Edge - click or drag'));

    expect(onInsertSnippet).toHaveBeenCalledWith(expect.stringContaining('Source --> Target'));
  });

  it('opens flowchart edge settings instead of inserting an edge on click', async () => {
    const user = userEvent.setup();
    const onInsertSnippet = vi.fn();
    const onOpenEdgeSettings = vi.fn();

    render(
      <TestDndContext>
        <ToolPalette
          source={defaultMermaidSource}
          onInsertSnippet={onInsertSnippet}
          onOpenEdgeSettings={onOpenEdgeSettings}
        />
      </TestDndContext>,
    );

    await user.click(screen.getByTitle('Edge - click or drag'));

    expect(onOpenEdgeSettings).toHaveBeenCalledOnce();
    expect(onInsertSnippet).not.toHaveBeenCalled();
  });

  it('opens selection mode instead of inserting source text', async () => {
    const user = userEvent.setup();
    const onInsertSnippet = vi.fn();
    const onSelectMode = vi.fn();

    render(
      <TestDndContext>
        <ToolPalette source={defaultMermaidSource} onInsertSnippet={onInsertSnippet} onSelectMode={onSelectMode} />
      </TestDndContext>,
    );

    await user.click(screen.getByTitle('Select - click or drag'));

    expect(onSelectMode).toHaveBeenCalledOnce();
    expect(onInsertSnippet).not.toHaveBeenCalled();
  });

  it('uses accessible labels, hover titles, and unclipped tooltips for icon-only tools', async () => {
    const user = userEvent.setup();

    render(
      <TestDndContext>
        <ToolPalette source="flowchart LR" onInsertSnippet={() => undefined} />
      </TestDndContext>,
    );

    expect(screen.getByLabelText('Rectangle - click or drag')).toHaveAttribute(
      'title',
      'Rectangle - click or drag',
    );
    expect(screen.getByLabelText('Edge - click or drag')).toHaveAttribute('data-tooltip', 'Edge - click or drag');

    await user.hover(screen.getByLabelText('Rectangle - click or drag'));

    expect(screen.getByRole('tooltip')).toHaveTextContent('Rectangle - click or drag');
  });

  it('marks the active edge tool', () => {
    render(
      <TestDndContext>
        <ToolPalette source={defaultMermaidSource} activeToolId="edge" onInsertSnippet={() => undefined} />
      </TestDndContext>,
    );

    expect(screen.getByLabelText('Edge - click or drag')).toHaveClass('is-active');
  });

  it('marks the active select tool', () => {
    render(
      <TestDndContext>
        <ToolPalette source={defaultMermaidSource} activeToolId="select" onInsertSnippet={() => undefined} />
      </TestDndContext>,
    );

    expect(screen.getByLabelText('Select - click or drag')).toHaveClass('is-active');
  });

  it('selects Mermaid-safe snippets for sequence diagrams', () => {
    const source = `sequenceDiagram
  participant User
  User->>Editor: Update source`;

    expect(detectMermaidShape(source)).toBe('sequence');
    expect(getToolSnippet('edge', source)).toBe('\n  Source->>Target: Message');
  });

  it('creates unique flowchart shape snippets', () => {
    const source = `flowchart LR
  Node1[Existing]
  Node1 --> Other`;

    expect(getToolSnippet('rectangle', source)).toBe('\n  Node2[New node]');
    expect(getToolSnippet('decision', source)).toBe('\n  Decision1{Decision?}');
  });
});
