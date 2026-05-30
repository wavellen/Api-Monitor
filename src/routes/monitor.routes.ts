import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as monitorController from '../controllers/monitor.controller';
import { authenticateRequest } from '../middleware/auth';

const createMonitorSchema = z.object({
  name: z.string().min(1).max(50),
  url: z.string().url(),
  check_interval_seconds: z.number().int().min(10).max(86400),
  expected_status_code: z.number().int().min(100).max(599),
});

const updateMonitorSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  url: z.string().url().optional(),
  check_interval_seconds: z.number().int().min(10).max(86400).optional(),
  expected_status_code: z.number().int().min(100).max(599).optional(),
  is_active: z.boolean().optional(),
});

async function validateCreateMonitor(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const result = createMonitorSchema.safeParse(request.body);
  if (!result.success) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: result.error.errors[0].message,
    });
    return;
  }
  request.body = result.data;
}

async function validateUpdateMonitor(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const result = updateMonitorSchema.safeParse(request.body);
  if (!result.success) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: result.error.errors[0].message,
    });
    return;
  }
  request.body = result.data;
}

export default async function monitorRoutes(app: FastifyInstance): Promise<void> {
  app.get('/monitors', { preHandler: [authenticateRequest] }, monitorController.getUserMonitorsHandler);
  app.get('/monitors/:monitorId', { preHandler: [authenticateRequest] }, monitorController.getMonitorHandler);
  app.post('/monitors', { preHandler: [authenticateRequest, validateCreateMonitor] }, monitorController.createMonitorHandler);
  app.patch('/monitors/:monitorId', { preHandler: [authenticateRequest, validateUpdateMonitor] }, monitorController.updateMonitorHandler);
  app.delete('/monitors/:monitorId', { preHandler: [authenticateRequest] }, monitorController.deleteMonitorHandler);
  app.get('/monitors/:monitorId/stream', { preHandler: [authenticateRequest] }, monitorController.streamMonitorHandler);
}
