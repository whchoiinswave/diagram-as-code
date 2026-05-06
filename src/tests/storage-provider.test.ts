import { describe, expect, it } from 'vitest';
import { createMemoryStorageProvider, detectDialectFromPath } from '../workspace/storage-provider';

describe('storage provider', () => {
  it('detects dialect hints from file paths', () => {
    expect(detectDialectFromPath('a/flow.mmd')).toBe('mermaid');
    expect(detectDialectFromPath('a/model.d2')).toBe('d2');
    expect(detectDialectFromPath('a/component.puml')).toBe('plantuml');
    expect(detectDialectFromPath('a/graph.dot')).toBe('graphviz');
    expect(detectDialectFromPath('a/workspace.structurizr')).toBe('structurizr');
  });

  it('lists, reads, and writes workspace documents', async () => {
    const provider = createMemoryStorageProvider('test', [
      {
        uri: 'memory://flow.mmd',
        relativePath: 'flow.mmd',
        source: 'flowchart LR\n  A --> B',
      },
    ]);

    await expect(provider.listFiles('memory://')).resolves.toEqual([
      expect.objectContaining({
        uri: 'memory://flow.mmd',
        relativePath: 'flow.mmd',
        dialectHint: 'mermaid',
      }),
    ]);

    await provider.writeTarget({ kind: 'file', uri: 'memory://flow.mmd', dialect: 'mermaid' }, 'updated');

    await expect(
      provider.readTarget({ kind: 'file', uri: 'memory://flow.mmd', dialect: 'mermaid' }),
    ).resolves.toBe('updated');
  });
});
