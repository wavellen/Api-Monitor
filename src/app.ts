import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { z } from 'zod';
import { config } from './config/env';

import authRoutes from './routes/auth.routes';
import monitorRoutes from './routes/monitor.routes';
import checkRoutes from './routes/check.routes';

const app = Fastify({ logger: true });

app.setErrorHandler((error, request, reply) => {
  if (error instanceof z.ZodError) {
    request.log.warn({ zodErrors: error.errors }, 'Validation error');
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.errors[0].message,
    });
    return;
  }
  request.log.error(error);
  reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
});

app.register(helmet);
app.register(cors);
app.register(jwt, { secret: config.jwtSecret });

app.register(authRoutes, { prefix: '/auth' });
app.register(monitorRoutes);
app.register(checkRoutes);

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

export default app;
