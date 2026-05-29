import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { authenticateRequest } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

async function validateRegister(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const result = registerSchema.safeParse(request.body);
  if (!result.success) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: result.error.errors[0].message,
    });
    return;
  }
}

async function validateLogin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const result = loginSchema.safeParse(request.body);
  if (!result.success) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: result.error.errors[0].message,
    });
    return;
  }
}

async function validateRefresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const result = refreshSchema.safeParse(request.body);
  if (!result.success) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: result.error.errors[0].message,
    });
    return;
  }
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', { preHandler: [validateRegister] }, authController.registerHandler);
  app.post('/login', { preHandler: [validateLogin] }, authController.loginHandler);
  app.post('/logout', { preHandler: [authenticateRequest] }, authController.logoutHandler);
  app.post('/refresh', { preHandler: [validateRefresh] }, authController.refreshHandler);
}
