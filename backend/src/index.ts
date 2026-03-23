import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth.js';
import { licenseRoutes } from './routes/license.js';
import { usageRoutes } from './routes/usage.js';
// DEFERRED: Payment gateway — uncomment when Stripe is configured
// import { checkoutRoutes } from './routes/checkout.js';
// import { webhookRoutes } from './routes/webhook.js';
import { teamRoutes } from './routes/team.js';
import { teamMemoryRoutes } from './routes/team-memory.js';
import { userRoutes } from './routes/users.js';

const app = new Hono();

const corsOrigins = process.env.NODE_ENV === 'production'
  ? ['https://arqzero.dev']
  : ['https://arqzero.dev', 'http://localhost:3000'];

app.use('/*', cors({
  origin: corsOrigins,
  credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok', version: '0.1.0' }));

app.route('/auth', authRoutes);
app.route('/license', licenseRoutes);
app.route('/usage', usageRoutes);
// DEFERRED: Payment gateway routes — uncomment when payment provider is configured
// app.route('/checkout', checkoutRoutes);
// app.route('/webhooks', webhookRoutes);
app.route('/team', teamRoutes);
app.route('/team-memory', teamMemoryRoutes);
app.route('/users', userRoutes);

const port = parseInt(process.env.PORT ?? '3001');
console.log(`ArqZero API running on port ${port}`);
serve({ fetch: app.fetch, port });

export default app;
