import { Hono } from 'hono';
import { z } from 'zod';
import { diagramTargetSchema, launchContextSchema } from '../../src/app/launch/launch-context';
import { listWorkspaceFiles, readServerTargetState, writeServerTarget } from '../storage/file-storage';

const rootQuerySchema = z.object({
  root: z.string().min(1),
});

const writeTargetSchema = z.object({
  root: z.string().min(1),
  target: diagramTargetSchema,
  source: z.string(),
});

export function createApp() {
  const app = new Hono();

  app.get('/api/health', (c) => c.json({ ok: true }));

  app.get('/api/files', async (c) => {
    const query = rootQuerySchema.parse({ root: c.req.query('root') });
    const files = await listWorkspaceFiles(query.root);
    return c.json({ files });
  });

  app.post('/api/target/read', async (c) => {
    const body = z.object({ root: z.string().min(1), target: diagramTargetSchema }).parse(await c.req.json());
    const state = await readServerTargetState(body.root, body.target);
    return c.json(state);
  });

  app.post('/api/target/write', async (c) => {
    const body = writeTargetSchema.parse(await c.req.json());
    const state = await writeServerTarget(body.root, body.target, body.source);
    return c.json({ ok: true, ...state });
  });

  app.post('/api/launch', async (c) => {
    const context = launchContextSchema.parse(await c.req.json());
    return c.json({ context });
  });

  return app;
}
