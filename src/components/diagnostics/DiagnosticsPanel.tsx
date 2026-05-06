import type { Diagnostic, RenderState } from '../../diagram/types';

type DiagnosticsPanelProps = {
  renderState: RenderState;
};

function getDiagnostics(renderState: RenderState): Diagnostic[] {
  if (renderState.status !== 'error') {
    return [];
  }

  return renderState.diagnostics;
}

export function DiagnosticsPanel({ renderState }: DiagnosticsPanelProps) {
  const diagnostics = getDiagnostics(renderState);

  return (
    <section className="diagnostics-panel" aria-label="Diagnostics">
      <div className="panel-title">Diagnostics</div>
      {diagnostics.length === 0 ? (
        <div className="diagnostics-ok">No render errors</div>
      ) : (
        <ul className="diagnostics-list">
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.message}-${index}`} className="diagnostic-item">
              <span className={`severity severity-${diagnostic.severity}`}>
                {diagnostic.severity}
              </span>
              <span>{diagnostic.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
