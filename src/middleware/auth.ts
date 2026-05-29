import { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../config/redis';

export async function authenticateRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<{ userId: string; email: string; jti: string }>();

    try {
      const blocked = await redis.get(`blocklist:${payload.jti}`);
      if (blocked !== null) {
        reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token has been revoked',
        });
        return;
      }
    } catch {
      reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Auth service temporarily unavailable',
      });
      return;
    }

  } catch {
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or missing token',
    });
  }
}
