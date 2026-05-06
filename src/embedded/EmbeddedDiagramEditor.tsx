import { useEffect, useState } from 'react';
import { DiagnosticsPanel } from '../components/diagnostics/DiagnosticsPanel';
import { CodeEditor } from '../components/editor/CodeEditor';
import { DiagramPreview } from '../components/preview/DiagramPreview';
import { mermaidDialect } from '../diagram/dialects/mermaid/mermaidDialect';
import { renderDiagram } from '../diagram/render-state';
import type { DiagramDialectId, RenderState } from '../diagram/types';

type EmbeddedDiagramEditorProps = {
  value: string;
  onChange: (value: string) => void;
  dialect?: DiagramDialectId;
  readOnly?: boolean;
  toolbar?: React.ReactNode;
};

export function EmbeddedDiagramEditor({
  value,
  onChange,
  dialect = 'mermaid',
  readOnly = false,
  toolbar,
}: EmbeddedDiagramEditorProps) {
  const [renderState, setRenderState] = useState<RenderState>({ status: 'idle' });
  const activeDialect = dialect === 'mermaid' ? mermaidDialect : mermaidDialect;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setRenderState({ status: 'rendering' });
      void renderDiagram(activeDialect, value).then((state) => {
        if (!cancelled) {
          setRenderState(state);
        }
      });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeDialect, value]);

  return (
    <div className="embedded-editor">
      {toolbar ? <div className="embedded-toolbar">{toolbar}</div> : null}
      <div className="embedded-grid">
        <CodeEditor value={value} onChange={onChange} readOnly={readOnly} />
        <div className="embedded-preview-stack">
          <DiagramPreview renderState={renderState} />
          <DiagnosticsPanel renderState={renderState} />
        </div>
      </div>
    </div>
  );
}
