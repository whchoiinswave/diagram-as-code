import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../server/http/app';
import {
  listWorkspaceFiles,
  readServerTarget,
  readServerTargetState,
  writeServerTarget,
} from '../../server/storage/file-storage';
import { findMarkdownBlocks, replaceMarkdownBlock } from '../../server/storage/markdown-blocks';

async function createTempWorkspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'diagram-as-code-'));
  await writeFile(path.join(root, 'flow.mmd'), 'flowchart LR\n  A --> B');
  await writeFile(
    path.join(root, 'architecture.md'),
    '# Architecture\n\n```mermaid\nflowchart LR\n  Old --> Node\n```\n',
  );
  await writeFile(path.join(root, 'notes.txt'), 'ignore me');
  return root;
}

describe('server storage', () => {
  it('lists diagram files under a workspace root', async () => {
    const root = await createTempWorkspace();

    await expect(listWorkspaceFiles(root)).resolves.toEqual([
      expect.objectContaining({ relativePath: 'architecture.md' }),
      expect.objectContaining({ relativePath: 'flow.mmd' }),
    ]);
  });

  it('reads and writes file targets', async () => {
    const root = await createTempWorkspace();
    const target = { kind: 'file' as const, uri: `${root}/flow.mmd`, dialect: 'mermaid' as const };

    await expect(readServerTarget(root, target)).resolves.toContain('A --> B');
    await writeServerTarget(root, target, 'flowchart LR\n  C --> D');
    await expect(readFile(path.join(root, 'flow.mmd'), 'utf8')).resolves.toContain('C --> D');
  });

  it('reads and replaces markdown block targets with stale protection', async () => {
    const markdown = '# A\n\n```mermaid\nflowchart LR\n  A --> B\n```\n';
    const [block] = findMarkdownBlocks(markdown);

    const replaced = replaceMarkdownBlock(
      markdown,
      { blockIndex: 0, dialect: 'mermaid', sourceHash: block.sourceHash },
      'flowchart LR\n  X --> Y',
    );

    expect(replaced).toContain('X --> Y');
    expect(() =>
      replaceMarkdownBlock(
        markdown,
        { blockIndex: 0, dialect: 'mermaid', sourceHash: 'sha256:stale' },
        'flowchart LR',
      ),
    ).toThrow('stale');
  });

  it('reports stale markdown block state without failing read', async () => {
    const root = await createTempWorkspace();
    const target = {
      kind: 'markdown-block' as const,
      uri: `${root}/architecture.md`,
      dialect: 'mermaid' as const,
      blockIndex: 0,
      startLine: 2,
      endLine: 5,
      sourceHash: 'sha256:stale',
    };

    await expect(readServerTargetState(root, target)).resolves.toEqual({
      source: expect.stringContaining('Old --> Node'),
      sourceHash: expect.stringMatching(/^sha256:/),
      stale: true,
    });
  });

  it('rejects paths that escape the workspace root', async () => {
    const root = await createTempWorkspace();
    const target = { kind: 'file' as const, uri: path.join(root, '..', 'escape.mmd'), dialect: 'mermaid' as const };

    await expect(readServerTarget(root, target)).rejects.toThrow('escapes workspace root');
  });

  it('serves workspace APIs through Hono', async () => {
    const root = await createTempWorkspace();
    const app = createApp();

    const filesResponse = await app.request(`/api/files?root=${encodeURIComponent(root)}`);
    await expect(filesResponse.json()).resolves.toEqual({
      files: expect.arrayContaining([expect.objectContaining({ relativePath: 'flow.mmd' })]),
    });

    const readResponse = await app.request('/api/target/read', {
      method: 'POST',
      body: JSON.stringify({
        root,
        target: { kind: 'file', uri: `${root}/flow.mmd`, dialect: 'mermaid' },
      }),
    });

    await expect(readResponse.json()).resolves.toEqual(expect.objectContaining({
      source: expect.stringContaining('A --> B'),
      stale: false,
    }));
  });
});
