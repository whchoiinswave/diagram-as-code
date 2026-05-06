import type { DiagramDialect, RenderState } from './types';

export async function renderDiagram(
  dialect: DiagramDialect,
  source: string,
): Promise<RenderState> {
  const result = await dialect.render(source);

  if (result.ok) {
    return {
      status: 'success',
      svg: result.svg,
    };
  }

  return {
    status: 'error',
    diagnostics: result.diagnostics,
  };
}
