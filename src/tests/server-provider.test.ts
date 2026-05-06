import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServerStorageProvider } from '../workspace/server-provider';

describe('server storage provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists files through the server API', async () => {
    const fetchMock = vi.fn(async () => Response.json({ files: [{ uri: 'server://a.mmd' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = createServerStorageProvider('/tmp/workspace');

    await expect(provider.listFiles('/tmp/workspace')).resolves.toEqual([{ uri: 'server://a.mmd' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/files?root=%2Ftmp%2Fworkspace');
  });

  it('reads and writes targets through the server API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ source: 'flowchart LR' }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = createServerStorageProvider('/tmp/workspace');
    const target = { kind: 'file' as const, uri: 'server://a.mmd', dialect: 'mermaid' as const };

    await expect(provider.readTarget(target)).resolves.toBe('flowchart LR');
    await expect(provider.writeTarget(target, 'updated')).resolves.toEqual({});

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/target/read',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/target/write',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns target stale metadata from the server API', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ source: 'flowchart LR', sourceHash: 'sha256:new', stale: true }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = createServerStorageProvider('/tmp/workspace');
    const target = {
      kind: 'markdown-block' as const,
      uri: 'server://architecture.md',
      dialect: 'mermaid' as const,
      blockIndex: 0,
      startLine: 1,
      endLine: 4,
      sourceHash: 'sha256:old',
    };

    await expect(provider.readTargetState?.(target)).resolves.toEqual({
      source: 'flowchart LR',
      sourceHash: 'sha256:new',
      stale: true,
    });
  });
});
