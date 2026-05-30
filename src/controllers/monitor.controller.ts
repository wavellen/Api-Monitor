import { FastifyRequest, FastifyReply } from 'fastify';
import type { CreateMonitorBody, UpdateMonitorBody } from '../types';
import * as monitorService from '../services/monitor.service';
import { scheduleMonitor, removeMonitor } from '../queues/monitor.queue';
import { handleServiceError } from '../utils/error';
import { addClient, removeClient, clearMonitorClients } from '../sse/sse.manager';

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

export async function streamMonitorHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { monitorId } = request.params as { monitorId: string };
    await monitorService.getMonitorById(request.user.userId, monitorId);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    reply.raw.write('data: {"type":"connected"}\n\n');

    addClient(monitorId, reply);

    request.raw.on('close', () => removeClient(monitorId, reply));

    // TODO Layer 12: implement 30s heartbeat interval
    // clear interval on request.raw 'close' event
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
    clearMonitorClients(monitorId);
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
