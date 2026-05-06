import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TopToolbar } from '../components/toolbar/TopToolbar';
import { mermaidTemplates } from '../diagram/templates/mermaidTemplates';

describe('TopToolbar', () => {
  it('changes templates through the select control', async () => {
    const user = userEvent.setup();
    const onTemplateChange = vi.fn();

    render(
      <TopToolbar
        templates={mermaidTemplates}
        selectedTemplateId="flowchart"
        renderState={{ status: 'idle' }}
        saveStatus="saved"
        onTemplateChange={onTemplateChange}
        onExportSvg={() => undefined}
        onExportMarkdown={() => undefined}
        onImportMarkdown={() => undefined}
        onSave={() => undefined}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Template'), 'sequence');

    expect(onTemplateChange).toHaveBeenCalledWith('sequence');
  });

  it('only enables svg export when rendering succeeded', () => {
    const { rerender } = render(
      <TopToolbar
        templates={mermaidTemplates}
        selectedTemplateId="flowchart"
        renderState={{ status: 'error', diagnostics: [] }}
        saveStatus="saved"
        onTemplateChange={() => undefined}
        onExportSvg={() => undefined}
        onExportMarkdown={() => undefined}
        onImportMarkdown={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(screen.getByTitle('Export SVG')).toBeDisabled();

    rerender(
      <TopToolbar
        templates={mermaidTemplates}
        selectedTemplateId="flowchart"
        renderState={{ status: 'success', svg: '<svg />' }}
        saveStatus="saved"
        onTemplateChange={() => undefined}
        onExportSvg={() => undefined}
        onExportMarkdown={() => undefined}
        onImportMarkdown={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(screen.getByTitle('Export SVG')).toBeEnabled();
  });

  it('passes the imported markdown file to the caller', async () => {
    const user = userEvent.setup();
    const onImportMarkdown = vi.fn();
    const file = new File(['```mermaid\nflowchart LR\n```'], 'diagram.md', {
      type: 'text/markdown',
    });

    render(
      <TopToolbar
        templates={mermaidTemplates}
        selectedTemplateId="flowchart"
        renderState={{ status: 'idle' }}
        saveStatus="saved"
        onTemplateChange={() => undefined}
        onExportSvg={() => undefined}
        onExportMarkdown={() => undefined}
        onImportMarkdown={onImportMarkdown}
        onSave={() => undefined}
      />,
    );

    await user.upload(screen.getByTitle('Import Markdown').querySelector('input')!, file);

    expect(onImportMarkdown).toHaveBeenCalledWith(file);
  });
});
