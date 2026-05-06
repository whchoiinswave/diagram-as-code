import { Download, FileInput, FileText, PanelLeft, Save, SplitSquareHorizontal } from 'lucide-react';
import type { DiagramTemplate, RenderState } from '../../diagram/types';

type TopToolbarProps = {
  templates: DiagramTemplate[];
  selectedTemplateId: string;
  renderState: RenderState;
  saveStatus: 'saved' | 'dirty' | 'saving' | 'error';
  onTemplateChange: (templateId: string) => void;
  onExportSvg: () => void;
  onExportMarkdown: () => void;
  onImportMarkdown: (file: File) => void;
  onSave: () => void;
};

export function TopToolbar({
  templates,
  selectedTemplateId,
  renderState,
  saveStatus,
  onTemplateChange,
  onExportSvg,
  onExportMarkdown,
  onImportMarkdown,
  onSave,
}: TopToolbarProps) {
  return (
    <header className="top-toolbar">
      <div className="brand">
        <SplitSquareHorizontal size={18} aria-hidden="true" />
        <span>Diagram as Code</span>
      </div>

      <div className="toolbar-group" aria-label="View controls">
        <button className="icon-button is-active" type="button" title="Workspace panel">
          <PanelLeft size={16} aria-hidden="true" />
        </button>
        <select
          className="template-select"
          aria-label="Template"
          value={selectedTemplateId}
          onChange={(event) => onTemplateChange(event.target.value)}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-spacer" />

      <div className="render-status" data-status={renderState.status}>
        {renderState.status}
      </div>

      <div className="toolbar-group" aria-label="Document actions">
        <label className="icon-button file-button" title="Import Markdown">
          <FileInput size={16} aria-hidden="true" />
          <input
            type="file"
            accept=".md,.mdx,text/markdown,text/plain"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) {
                onImportMarkdown(file);
                event.currentTarget.value = '';
              }
            }}
          />
        </label>
        <button className="icon-button" type="button" title="Export Markdown" onClick={onExportMarkdown}>
          <FileText size={16} aria-hidden="true" />
        </button>
        <button
          className="icon-button"
          type="button"
          title="Export SVG"
          onClick={onExportSvg}
          disabled={renderState.status !== 'success'}
        >
          <Download size={16} aria-hidden="true" />
        </button>
        <button
          className={saveStatus === 'dirty' ? 'icon-button is-active' : 'icon-button'}
          type="button"
          title={`Save (${saveStatus})`}
          disabled={saveStatus === 'saving'}
          onClick={onSave}
        >
          <Save size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
