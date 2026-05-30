import { FastifyInstance } from 'fastify';
import * as alertController from '../controllers/alert.controller';
import { authenticateRequest } from '../middleware/auth';

export default async function alertRoutes(app: FastifyInstance): Promise<void> {
  app.get('/monitors/:monitorId/alerts', { preHandler: [authenticateRequest] }, alertController.getAlertsHandler);
  app.get('/monitors/:monitorId/alerts/:alertId', { preHandler: [authenticateRequest] }, alertController.getAlertHandler);
  app.patch('/monitors/:monitorId/alerts/:alertId', { preHandler: [authenticateRequest] }, alertController.resolveAlertHandler);
}
