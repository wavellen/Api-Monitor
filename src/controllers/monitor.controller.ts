import { FastifyRequest, FastifyReply } from 'fastify';
import type { CreateMonitorBody, UpdateMonitorBody } from '../types';
import * as monitorService from '../services/monitor.service';
import { scheduleMonitor, removeMonitor } from '../queues/monitor.queue';

const ERROR_MAP: Record<string, { status: number; label: string }> = {
  'Monitor not found': { status: 404, label: 'Not Found' },
  'Monitor limit reached': { status: 429, label: 'Too Many Requests' },
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

export async function createMonitorHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const monitor = await monitorService.createMonitor(request.user.userId, request.body as CreateMonitorBody);

    try {
      await scheduleMonitor(monitor.id, monitor.check_interval_seconds);
    } catch {
      await monitorService.deleteMonitor(request.user.userId, monitor.id);
      reply.status(503).send({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Failed to schedule check',
      });
      return;
    }

    reply.status(201).send(monitor);
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}

export async function getUserMonitorsHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const q = request.query as Record<string, string>;
    const isActive = q.active !== undefined ? q.active === 'true' : undefined;
    const monitors = await monitorService.getUserMonitors(request.user.userId, isActive);
    reply.send(monitors);
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}

export async function getMonitorHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { monitorId } = request.params as { monitorId: string };
    const monitor = await monitorService.getMonitorById(request.user.userId, monitorId);
    reply.send(monitor);
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}

export async function updateMonitorHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { monitorId } = request.params as { monitorId: string };
    const body = request.body as UpdateMonitorBody;
    const monitor = await monitorService.updateMonitor(request.user.userId, monitorId, body);

    if (body.is_active !== undefined) {
      try {
        if (body.is_active) {
          await scheduleMonitor(monitorId, monitor.check_interval_seconds);
        } else {
          await removeMonitor(monitorId);
        }
      } catch {
        await monitorService.updateMonitor(request.user.userId, monitorId, { is_active: monitor.prev_is_active });
        reply.status(503).send({
          statusCode: 503,
          error: 'Service Unavailable',
          message: 'Failed to update schedule',
        });
        return;
      }
    }

    reply.send(monitor);
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}

export async function deleteMonitorHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { monitorId } = request.params as { monitorId: string };
    await monitorService.deleteMonitor(request.user.userId, monitorId);

    try {
      await removeMonitor(monitorId);
    } catch {
      console.error(`Failed to remove monitor schedule for ${monitorId}`);
    }

    reply.send({ message: 'Monitor deleted' });
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}
