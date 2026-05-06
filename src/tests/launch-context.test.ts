import { describe, expect, it } from 'vitest';
import { createRoomId, parseLaunchContext } from '../app/launch/launch-context';

describe('launch context', () => {
  it('parses file target query parameters and creates a room id', () => {
    const context = parseLaunchContext(
      'http://localhost/?mode=collaboration&workspaceId=docs&targetKind=file&targetUri=server://a.mmd&dialect=mermaid',
    );

    expect(context).toEqual({
      mode: 'collaboration',
      workspaceId: 'docs',
      rootUri: undefined,
      readOnly: undefined,
      target: { kind: 'file', uri: 'server://a.mmd', dialect: 'mermaid' },
      roomId: 'docs:server://a.mmd:mermaid',
    });
  });

  it('parses encoded launch payloads', () => {
    const payload = encodeURIComponent(
      JSON.stringify({
        mode: 'workspace',
        workspaceId: 'docs',
        target: { kind: 'file', uri: 'server://flow.mmd', dialect: 'mermaid' },
      }),
    );

    expect(parseLaunchContext(`http://localhost/?launch=${payload}`).roomId).toBe(
      'docs:server://flow.mmd:mermaid',
    );
  });

  it('creates markdown block room ids', () => {
    expect(
      createRoomId({
        workspaceId: 'docs',
        target: {
          kind: 'markdown-block',
          uri: 'server://architecture.md',
          dialect: 'mermaid',
          blockIndex: 2,
          startLine: 10,
          endLine: 20,
          sourceHash: 'sha256:test',
        },
      }),
    ).toBe('docs:server://architecture.md:mermaid:2');
  });
});
