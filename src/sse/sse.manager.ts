import { FastifyReply } from 'fastify';

const clients = new Map<string, Set<FastifyReply>>();

export function addClient(monitorId: string, reply: FastifyReply): void {
  if (!clients.has(monitorId)) {
    clients.set(monitorId, new Set());
  }
  clients.get(monitorId)!.add(reply);
}

export function removeClient(monitorId: string, reply: FastifyReply): void {
  const set = clients.get(monitorId);
  if (!set) return;
  set.delete(reply);
  if (set.size === 0) {
    clients.delete(monitorId);
  }
}

export function broadcast(monitorId: string, data: object): void {
  const set = clients.get(monitorId);
  if (!set) return;
  for (const reply of set) {
    try {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      removeClient(monitorId, reply);
    }
  }
}

export function clearMonitorClients(monitorId: string): void {
  const set = clients.get(monitorId);
  if (!set) return;
  for (const reply of set) {
    try {
      reply.raw.end();
    } catch {
      // connection already closed
    }
  }
  clients.delete(monitorId);
}
