import { describe, expect, it } from 'vitest';
import { createCollaborationServer } from '../../server/collaboration/hocuspocus';

describe('hocuspocus server factory', () => {
  it('creates a configured collaboration server', () => {
    const server = createCollaborationServer({ port: 43210, sqlitePath: ':memory:' });

    expect(server).toBeDefined();
    expect(server.configuration.name).toBe('diagram-as-code-collaboration');
    expect(server.configuration.port).toBe(43210);
  });
});
