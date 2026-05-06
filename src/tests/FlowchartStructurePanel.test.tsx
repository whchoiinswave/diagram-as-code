import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FlowchartStructurePanel } from '../components/structure/FlowchartStructurePanel';
import { defaultMermaidSource } from '../diagram/templates/mermaidTemplates';

describe('FlowchartStructurePanel', () => {
  it('updates the selected node label and shape', async () => {
    const user = userEvent.setup();
    const onChangeSource = vi.fn();

    render(<FlowchartStructurePanel source={defaultMermaidSource} onChangeSource={onChangeSource} />);

    await user.click(screen.getByRole('button', { name: /Auth Authorized\?/i }));
    await user.clear(screen.getByLabelText('Node label'));
    await user.type(screen.getByLabelText('Node label'), 'Approved?');
    await user.selectOptions(screen.getByLabelText('Node shape'), 'rectangle');

    expect(onChangeSource).toHaveBeenCalledWith(expect.stringContaining('Auth[Approved?]'));
  });

  it('syncs node selection from the preview and can delete the selected node', async () => {
    const user = userEvent.setup();
    const onDeleteSelection = vi.fn();

    render(
      <FlowchartStructurePanel
        source={defaultMermaidSource}
        selectedElement={{ kind: 'node', id: 'Auth' }}
        onChangeSource={() => undefined}
        onDeleteSelection={onDeleteSelection}
      />,
    );

    expect(screen.getByLabelText('Node label')).toHaveValue('Authorized?');
    expect(screen.getByRole('button', { name: /Auth Authorized\?/i })).toHaveClass('is-selected');

    await user.click(screen.getByTitle('Delete selected node'));

    expect(onDeleteSelection).toHaveBeenCalledWith({ kind: 'node', id: 'Auth' });
  });

  it('shows node edit controls instead of edge connection controls in selection mode', () => {
    render(
      <FlowchartStructurePanel
        source={defaultMermaidSource}
        selectedElement={{ kind: 'node', id: 'Auth' }}
        selectionModeActive
        onChangeSource={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Node label')).toHaveValue('Authorized?');
    expect(screen.queryByLabelText('Edge source')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Connect edge')).not.toBeInTheDocument();
  });

  it('adds an edge between selected nodes', async () => {
    const user = userEvent.setup();
    const onChangeSource = vi.fn();

    render(<FlowchartStructurePanel source={defaultMermaidSource} onChangeSource={onChangeSource} />);

    await user.selectOptions(screen.getByLabelText('Edge source'), 'Request');
    await user.selectOptions(screen.getByLabelText('Edge target'), 'Response');
    await user.type(screen.getByLabelText('Edge label'), 'returns');
    await user.click(screen.getByTitle('Connect edge'));

    expect(onChangeSource).toHaveBeenCalledWith(expect.stringContaining('Request -->|returns| Response'));
  });

  it('adds typed edges from the edge editor', async () => {
    const user = userEvent.setup();
    const onChangeSource = vi.fn();

    render(<FlowchartStructurePanel source={defaultMermaidSource} onChangeSource={onChangeSource} />);

    await user.selectOptions(screen.getByLabelText('Edge source'), 'Request');
    await user.selectOptions(screen.getByLabelText('Edge target'), 'Response');
    await user.selectOptions(screen.getByLabelText('Edge type'), 'dotted');
    await user.type(screen.getByLabelText('Edge label'), 'returns');
    await user.click(screen.getByTitle('Connect edge'));

    expect(onChangeSource).toHaveBeenCalledWith(expect.stringContaining('Request -. returns .-> Response'));
  });

  it('selects, edits, and deletes existing edges from the edge list', async () => {
    const user = userEvent.setup();
    const onSelectElement = vi.fn();
    const onDeleteSelection = vi.fn();
    const onChangeSource = vi.fn();

    render(
      <FlowchartStructurePanel
        source={defaultMermaidSource}
        selectedElement={{ kind: 'edge', id: '1:Request:Gateway' }}
        selectionModeActive
        onChangeSource={onChangeSource}
        onSelectElement={onSelectElement}
        onDeleteSelection={onDeleteSelection}
      />,
    );

    expect(screen.getByLabelText('Selected edge')).toHaveTextContent('Request');
    expect(screen.getByLabelText('Selected edge source')).toHaveValue('Request');
    expect(screen.getByLabelText('Selected edge target')).toHaveValue('Gateway');
    expect(screen.getByLabelText('Selected edge type')).toHaveValue('arrow');
    expect(screen.queryByLabelText('Edge source')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request to Gateway' })).toHaveClass('is-selected');

    await user.selectOptions(screen.getByLabelText('Selected edge type'), 'thick');
    await user.type(screen.getByLabelText('Selected edge label'), 'returns');

    expect(onChangeSource).toHaveBeenCalledWith(expect.stringContaining('Request == returns ==> Gateway'));

    await user.click(screen.getByRole('button', { name: /Gateway to Auth/i }));

    expect(onSelectElement).toHaveBeenCalledWith({ kind: 'edge', id: '2:Gateway:Auth' });

    await user.click(screen.getByTitle('Delete selected edge'));

    expect(onDeleteSelection).toHaveBeenCalledWith({ kind: 'edge', id: '1:Request:Gateway' });
  });

  it('focuses the edge editor when requested', async () => {
    const { rerender } = render(
      <FlowchartStructurePanel source={defaultMermaidSource} focusEdgeSignal={0} onChangeSource={() => undefined} />,
    );

    rerender(
      <FlowchartStructurePanel source={defaultMermaidSource} focusEdgeSignal={1} onChangeSource={() => undefined} />,
    );

    await waitFor(() => expect(screen.getByLabelText('Edge source')).toHaveFocus());
  });

  it('syncs controlled edge settings from preview interactions', async () => {
    const user = userEvent.setup();
    const onEdgeDraftChange = vi.fn();
    const edgeDraft = { from: 'Request', to: 'Gateway', label: 'sync', type: 'thick' as const };

    render(
      <FlowchartStructurePanel
        source={defaultMermaidSource}
        edgeDraft={edgeDraft}
        onChangeSource={() => undefined}
        onEdgeDraftChange={onEdgeDraftChange}
      />,
    );

    expect(screen.getByLabelText('Edge source')).toHaveValue('Request');
    expect(screen.getByLabelText('Edge target')).toHaveValue('Gateway');
    expect(screen.getByLabelText('Edge type')).toHaveValue('thick');
    expect(screen.getByLabelText('Edge label')).toHaveValue('sync');

    await user.selectOptions(screen.getByLabelText('Edge target'), 'Response');

    expect(onEdgeDraftChange).toHaveBeenCalledWith({ ...edgeDraft, to: 'Response' });
  });

  it('does not render for non-flowchart diagrams', () => {
    render(<FlowchartStructurePanel source="sequenceDiagram\n  A->>B: Hi" onChangeSource={() => undefined} />);

    expect(screen.queryByLabelText('Flowchart structure')).not.toBeInTheDocument();
  });
});
