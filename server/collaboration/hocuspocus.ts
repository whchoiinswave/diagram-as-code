import { Server } from '@hocuspocus/server';
import { SQLite } from '@hocuspocus/extension-sqlite';

export type CollaborationServerOptions = {
  port?: number;
  sqlitePath?: string;
};

export function createCollaborationServer({
  port = 1234,
  sqlitePath = ':memory:',
}: CollaborationServerOptions = {}) {
  return new Server({
    port,
    name: 'diagram-as-code-collaboration',
    extensions: [
      new SQLite({
        database: sqlitePath,
      }),
    ],
  });
}
