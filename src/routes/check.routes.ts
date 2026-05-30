import { FastifyInstance } from 'fastify';
import * as checkController from '../controllers/check.controller';
import { authenticateRequest } from '../middleware/auth';

export default async function checkRoutes(app: FastifyInstance): Promise<void> {
  app.get('/monitors/:monitorId/checks', { preHandler: [authenticateRequest] }, checkController.getChecksHandler);
  app.get('/monitors/:monitorId/checks/:checkId', { preHandler: [authenticateRequest] }, checkController.getCheckHandler);
}
