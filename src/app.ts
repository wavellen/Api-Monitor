import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config/env';

import authRoutes from './routes/auth.routes';
import monitorRoutes from './routes/monitor.routes';

const app = Fastify({ logger: true });

app.register(helmet);
app.register(cors);
app.register(jwt, { secret: config.jwtSecret });

app.register(authRoutes, { prefix: '/auth' });
app.register(monitorRoutes);

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

export default app;
