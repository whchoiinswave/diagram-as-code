import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiagramPreview } from '../components/preview/DiagramPreview';

const panzoomMock = vi.hoisted(() => {
  const instance = {
    destroy: vi.fn(),
    getScale: vi.fn(() => 1),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    reset: vi.fn(),
    zoom: vi.fn(),
    pan: vi.fn(),
    zoomWithWheel: vi.fn(),
  };

  return {
    instance,
    create: vi.fn(() => instance),
  };
});

vi.mock('@panzoom/panzoom', () => ({
  default: panzoomMock.create,
}));

describe('DiagramPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables transform controls until a diagram renders successfully', () => {
    render(<DiagramPreview renderState={{ status: 'error', diagnostics: [] }} />);

    expect(screen.getByTitle('Pan mode')).toBeDisabled();
    expect(screen.getByTitle('Zoom in')).toBeDisabled();
    expect(screen.getByText('Render error')).toBeInTheDocument();
  });

  it('renders svg and wires zoom controls when rendering succeeds', async () => {
    const user = userEvent.setup();

    render(
      <DiagramPreview
        renderState={{
          status: 'success',
          svg: '<svg role="img" aria-label="Rendered diagram"><g></g></svg>',
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Rendered diagram' })).toBeInTheDocument();
    expect(panzoomMock.create).toHaveBeenCalled();

    await user.click(screen.getByTitle('Zoom in'));
    await user.click(screen.getByTitle('Zoom out'));
    await user.click(screen.getByTitle('Reset view'));

    expect(panzoomMock.instance.zoomIn).toHaveBeenCalled();
    expect(panzoomMock.instance.zoomOut).toHaveBeenCalled();
    expect(panzoomMock.instance.reset).toHaveBeenCalled();
  });

  it('toggles pan mode', async () => {
    const user = userEvent.setup();

    render(
      <DiagramPreview
        renderState={{
          status: 'success',
          svg: '<svg role="img" aria-label="Rendered diagram"><g></g></svg>',
        }}
      />,
    );

    const panButton = screen.getByTitle('Pan mode');
    await user.click(panButton);

    expect(panButton).toHaveClass('is-active');
  });

  it('annotates flowchart nodes and reports edge-mode node clicks', async () => {
    const user = userEvent.setup();
    const onEdgeNodeClick = vi.fn();

    render(
      <DiagramPreview
        renderState={{
          status: 'success',
          svg: '<svg role="img" aria-label="Rendered diagram"><g class="node" id="flowchart-Request-0"><rect width="80" height="36" /></g></svg>',
        }}
        flowchartNodes={[{ id: 'Request', label: 'Client Request' }]}
        edgeDraft={{ from: '', to: '', label: '', type: 'arrow' }}
        edgeModeActive
        onEdgeNodeClick={onEdgeNodeClick}
      />,
    );

    const node = await screen.findByLabelText('Diagram node Request');

    expect(node).toHaveAttribute('data-flowchart-node-id', 'Request');

    await user.click(node);

    expect(onEdgeNodeClick).toHaveBeenCalledWith('Request');
  });

  it('selects annotated flowchart nodes in selection mode', async () => {
    const user = userEvent.setup();
    const onSelectElement = vi.fn();

    render(
      <DiagramPreview
        renderState={{
          status: 'success',
          svg: '<svg role="img" aria-label="Rendered diagram"><g class="node" id="flowchart-Request-0"><rect width="80" height="36" /></g></svg>',
        }}
        flowchartNodes={[{ id: 'Request', label: 'Client Request' }]}
        selectionModeActive
        selectedElement={{ kind: 'node', id: 'Request' }}
        onSelectElement={onSelectElement}
      />,
    );

    const node = await screen.findByLabelText('Diagram node Request');

    expect(node).toHaveClass('is-selected');

    await user.click(node);

    expect(onSelectElement).toHaveBeenCalledWith({ kind: 'node', id: 'Request' });
  });

  it('annotates flowchart edges and reports selection-mode edge clicks', async () => {
    const user = userEvent.setup();
    const onSelectElement = vi.fn();

    const { container } = render(
      <DiagramPreview
        renderState={{
          status: 'success',
          svg: '<svg role="img" aria-label="Rendered diagram"><path id="diagram-test-L_Request_Gateway_0" class="flowchart-link" d="M0 0 L20 20" /></svg>',
        }}
        flowchartEdges={[{ id: '1:Request:Gateway', from: 'Request', to: 'Gateway', label: '' }]}
        selectionModeActive
        onSelectElement={onSelectElement}
      />,
    );

    const edge = await screen.findByLabelText('Diagram edge Request to Gateway');
    const hitArea = container.querySelector('.preview-flowchart-edge-hit-area');

    expect(edge).toHaveAttribute('data-flowchart-edge-id', '1:Request:Gateway');
    expect(hitArea).toHaveAttribute('data-flowchart-edge-id', '1:Request:Gateway');

    await user.click(hitArea ?? edge);

    expect(onSelectElement).toHaveBeenCalledWith({ kind: 'edge', id: '1:Request:Gateway' });
  });
});
