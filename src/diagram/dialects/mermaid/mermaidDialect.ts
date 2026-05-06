import mermaid from 'mermaid';
import { mermaidTemplates } from '../../templates/mermaidTemplates';
import type { Diagnostic, DiagramDialect, RenderResult } from '../../types';

let renderSequence = 0;

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  themeVariables: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    primaryColor: '#e8f6f3',
    primaryBorderColor: '#138a72',
    primaryTextColor: '#173b35',
    lineColor: '#59636f',
    secondaryColor: '#fff5d6',
    tertiaryColor: '#f7f8fb',
  },
});

function toDiagnostic(error: unknown): Diagnostic {
  if (error instanceof Error) {
    return {
      severity: 'error',
      message: error.message,
    };
  }

  return {
    severity: 'error',
    message: String(error),
  };
}

export const mermaidDialect: DiagramDialect = {
  id: 'mermaid',
  label: 'Mermaid',
  detect: (source: string) =>
    /^\s*(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram|journey|gantt|pie|mindmap)\b/m.test(
      source,
    ),
  render: async (source: string): Promise<RenderResult> => {
    const trimmed = source.trim();

    if (!trimmed) {
      return {
        ok: false,
        diagnostics: [{ severity: 'info', message: 'Source is empty.' }],
      };
    }

    try {
      const id = `diagram-${Date.now()}-${renderSequence++}`;
      const { svg } = await mermaid.render(id, trimmed);
      return { ok: true, svg };
    } catch (error) {
      return {
        ok: false,
        diagnostics: [toDiagnostic(error)],
      };
    }
  },
  templates: mermaidTemplates,
  aiHints:
    'Return Mermaid source only. Preserve user intent and prefer small, reviewable source edits.',
};
