import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/*', cors({
  origin: ['https://arqzero.dev', 'http://localhost:3000'],
  credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }));

const port = parseInt(process.env.PORT ?? '3001');
console.log(`ArqZero API running on port ${port}`);
serve({ fetch: app.fetch, port });

export default app;
