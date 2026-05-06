import { describe, expect, it } from 'vitest';
import { buildFileTree, flattenFiles, getAdjacentFile } from '../workspace/tree';
import type { DiagramFile } from '../workspace/storage-provider';

const files: DiagramFile[] = [
  { uri: 'memory://b/two.mmd', name: 'two.mmd', relativePath: 'b/two.mmd', kind: 'file' },
  { uri: 'memory://a/one.mmd', name: 'one.mmd', relativePath: 'a/one.mmd', kind: 'file' },
];

describe('workspace tree', () => {
  it('builds folder nodes from relative paths', () => {
    const tree = buildFileTree(files);

    expect(tree).toEqual([
      expect.objectContaining({ kind: 'folder', name: 'a' }),
      expect.objectContaining({ kind: 'folder', name: 'b' }),
    ]);
    expect(flattenFiles(tree).map((file) => file.relativePath)).toEqual(['a/one.mmd', 'b/two.mmd']);
  });

  it('finds adjacent files with wraparound', () => {
    const ordered = flattenFiles(buildFileTree(files));

    expect(getAdjacentFile(ordered, 'memory://a/one.mmd', 'next')?.relativePath).toBe('b/two.mmd');
    expect(getAdjacentFile(ordered, 'memory://a/one.mmd', 'previous')?.relativePath).toBe('b/two.mmd');
  });
});
