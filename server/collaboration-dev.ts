import { createCollaborationServer } from './collaboration/hocuspocus';

const port = Number(process.env.COLLAB_PORT ?? 1234);
const sqlitePath = process.env.COLLAB_SQLITE ?? ':memory:';

const server = createCollaborationServer({
  port,
  sqlitePath,
});

await server.listen();

console.log(`diagram-as-code collaboration listening on ws://localhost:${port}`);
