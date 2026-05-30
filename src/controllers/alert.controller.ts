import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as alertService from '../services/alert.service';
import { handleServiceError } from '../utils/error';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  from: z.coerce.date()
    .optional()
    .refine(d => d === undefined || !isNaN(d.getTime()), { message: 'Invalid date' }),
  to: z.coerce.date()
    .optional()
    .refine(d => d === undefined || !isNaN(d.getTime()), { message: 'Invalid date' }),
}).refine(data => {
  if (data.from && data.to) return data.from <= data.to;
  return true;
}, { message: 'from must be before to', path: ['from'] });

export async function getAlertsHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { monitorId } = request.params as { monitorId: string };
    const query = querySchema.parse(request.query);
    const result = await alertService.getAlerts(monitorId, request.user.userId, query.page, query.limit, query.from, query.to);
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

export async function getAlertHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { monitorId, alertId } = request.params as { monitorId: string; alertId: string };
    const alert = await alertService.getAlertById(monitorId, alertId, request.user.userId);
    reply.send(alert);
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}

export async function resolveAlertHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { monitorId, alertId } = request.params as { monitorId: string; alertId: string };
    const alert = await alertService.resolveAlert(monitorId, alertId, request.user.userId);
    reply.send(alert);
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}
