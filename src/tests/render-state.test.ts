import { describe, expect, it, vi } from 'vitest';
import { renderDiagram } from '../diagram/render-state';
import type { DiagramDialect, RenderResult } from '../diagram/types';

function createDialect(render: DiagramDialect['render']): DiagramDialect {
  return {
    id: 'mermaid',
    label: 'Mermaid',
    detect: () => true,
    render,
    templates: [],
    aiHints: '',
  };
}

describe('renderDiagram', () => {
  it('returns success state when the dialect renders svg', async () => {
    const dialect = createDialect(
      vi.fn(async (): Promise<RenderResult> => ({ ok: true, svg: '<svg />' })),
    );

    await expect(renderDiagram(dialect, 'flowchart LR')).resolves.toEqual({
      status: 'success',
      svg: '<svg />',
    });
  });

  it('returns error state when the dialect reports diagnostics', async () => {
    const diagnostics = [{ severity: 'error' as const, message: 'Parse error' }];
    const dialect = createDialect(
      vi.fn(async (): Promise<RenderResult> => ({ ok: false, diagnostics })),
    );

    await expect(renderDiagram(dialect, 'bad source')).resolves.toEqual({
      status: 'error',
      diagnostics,
    });
  });
});
