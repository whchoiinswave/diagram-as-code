import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceShell } from '../components/explorer/WorkspaceShell';
import { sampleWorkspaceDocuments } from '../workspace/sample-workspace';
import type { DiagramFile } from '../workspace/storage-provider';

  const files: DiagramFile[] = sampleWorkspaceDocuments.map((document) => ({
  uri: document.uri,
  name: document.relativePath.split('/').slice(-1)[0] ?? document.relativePath,
  relativePath: document.relativePath,
  dialectHint: document.dialectHint,
  kind: 'file',
}));

function renderShell(overrides: Partial<ComponentProps<typeof WorkspaceShell>> = {}) {
  const props: ComponentProps<typeof WorkspaceShell> = {
    files,
    activeUri: 'sample://architecture/system-flow.mmd',
    rootLabel: 'sample-workspace',
    rootInput: 'sample://',
    saveStatus: 'saved',
    onRootInputChange: vi.fn(),
    onLoadSample: vi.fn(),
    onImportFiles: vi.fn(),
    onSelectFile: vi.fn(),
    onNavigate: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  };

  render(<WorkspaceShell {...props} />);

  return props;
}

describe('WorkspaceShell', () => {
  it('shows the active file and supported extension chips', () => {
    renderShell();

    expect(screen.getByRole('button', { name: /architecture\/system-flow\.mmd/i })).toHaveClass(
      'is-selected',
    );
    expect(screen.getByText('.mmd')).toBeInTheDocument();
  });

  it('calls onSelectFile when a file is selected', async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();

    renderShell({ onSelectFile });

    await user.click(screen.getByRole('button', { name: /docs\/api-sequence\.md/i }));

    expect(onSelectFile).toHaveBeenCalledWith(expect.objectContaining({ relativePath: 'docs/api-sequence.md' }));
  });

  it('supports root input, navigation, and save actions', async () => {
    const user = userEvent.setup();
    const onRootInputChange = vi.fn();
    const onNavigate = vi.fn();
    const onSave = vi.fn();

    renderShell({ saveStatus: 'dirty', onRootInputChange, onNavigate, onSave });

    fireEvent.change(screen.getByLabelText('Workspace root'), {
      target: { value: 'browser://docs' },
    });
    await user.click(screen.getByTitle('Next file'));
    await user.click(screen.getByTitle('Save active file'));

    expect(onRootInputChange).toHaveBeenLastCalledWith('browser://docs');
    expect(onNavigate).toHaveBeenCalledWith('next');
    expect(onSave).toHaveBeenCalled();
  });
});
