import { serve } from '@hono/node-server';
import { createApp } from './http/app';

const port = Number(process.env.PORT ?? 8787);

serve({
  fetch: createApp().fetch,
  port,
});

console.log(`diagram-as-code API listening on http://localhost:${port}`);
