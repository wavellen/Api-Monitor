import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as checkService from '../services/check.service';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const ERROR_MAP: Record<string, { status: number; label: string }> = {
  'Monitor not found': { status: 404, label: 'Not Found' },
  'Check not found': { status: 404, label: 'Not Found' },
};

function handleServiceError(reply: FastifyReply, error: unknown): void {
  if (error instanceof Error && ERROR_MAP[error.message]) {
    const { status, label } = ERROR_MAP[error.message];
    reply.status(status).send({
      statusCode: status,
      error: label,
      message: error.message,
    });
  } else {
    throw error;
  }
}

export async function getChecksHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { monitorId } = request.params as { monitorId: string };
    const query = querySchema.parse(request.query);
    const result = await checkService.getChecks(monitorId, request.user.userId, query.page, query.limit);
    reply.send(result);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.errors[0].message,
      });
      return;
    }
    handleServiceError(reply, error);
  }
}

export async function getCheckHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { monitorId, checkId } = request.params as { monitorId: string; checkId: string };
    const check = await checkService.getCheckById(monitorId, checkId, request.user.userId);
    reply.send(check);
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}
