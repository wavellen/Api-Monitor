import { sql } from '../config/db';
import type { Alert, AlertResponse, PaginatedAlerts } from '../types';

export async function getAlerts(
  monitorId: string,
  userId: string,
  page: number,
  limit: number,
  from?: Date,
  to?: Date,
): Promise<PaginatedAlerts> {
  const offset = (page - 1) * limit;

  const fromFilter = from ? sql`AND a.triggered_at >= ${from}` : sql``;
  const toFilter = to ? sql`AND a.triggered_at <= ${to}` : sql``;

  const rows = await sql<(Alert & { total_count: number })[]>`
    SELECT a.id, a.monitor_id, a.triggered_at, a.resolved_at,
           COUNT(*) OVER()::int AS total_count
    FROM alerts a
    JOIN monitors m ON m.id = a.monitor_id AND m.user_id = ${userId}
    WHERE a.monitor_id = ${monitorId}
    ${fromFilter}
    ${toFilter}
    ORDER BY a.triggered_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  if (rows.length === 0) {
    const [monitor] = await sql<[{ id: string }]>`
      SELECT id FROM monitors WHERE id = ${monitorId} AND user_id = ${userId}
    `;
    if (!monitor) throw new Error('Monitor not found');

    const [{ count }] = await sql<[{ count: number }]>`
      SELECT COUNT(*)::int as count
      FROM alerts a
      JOIN monitors m ON m.id = a.monitor_id AND m.user_id = ${userId}
      WHERE a.monitor_id = ${monitorId}
      ${fromFilter}
      ${toFilter}
    `;
    return { data: [], pagination: { total: count, page, limit } };
  }

  const total = rows[0].total_count;
  const data: AlertResponse[] = rows.map(({ total_count: _, ...alert }) => alert);

  return { data, pagination: { total, page, limit } };
}

export async function getAlertById(
  monitorId: string,
  alertId: string,
  userId: string,
): Promise<AlertResponse> {
  const [row] = await sql<AlertResponse[]>`
    SELECT a.id, a.monitor_id, a.triggered_at, a.resolved_at
    FROM alerts a
    JOIN monitors m ON m.id = a.monitor_id
    WHERE a.id = ${alertId} AND a.monitor_id = ${monitorId}
    AND m.user_id = ${userId}
  `;

  if (!row) throw new Error('Alert not found');
  return row;
}

export async function resolveAlert(
  monitorId: string,
  alertId: string,
  userId: string,
): Promise<AlertResponse> {
  const [updated] = await sql<AlertResponse[]>`
    UPDATE alerts a SET resolved_at = NOW()
    FROM monitors m
    WHERE a.id = ${alertId}
      AND a.monitor_id = ${monitorId}
      AND m.id = a.monitor_id
      AND m.user_id = ${userId}
      AND a.resolved_at IS NULL
    RETURNING a.id, a.monitor_id, a.triggered_at, a.resolved_at
  `;

  if (updated) return updated;

  const [existing] = await sql<AlertResponse[]>`
    SELECT a.id, a.monitor_id, a.triggered_at, a.resolved_at
    FROM alerts a
    JOIN monitors m ON m.id = a.monitor_id
    WHERE a.id = ${alertId} AND a.monitor_id = ${monitorId}
    AND m.user_id = ${userId}
  `;

  if (!existing) throw new Error('Alert not found');
  throw new Error('Alert already resolved');
}

export async function getOpenAlert(monitorId: string): Promise<{ id: string } | null> {
  const [alert] = await sql<[{ id: string }]>`
    SELECT id FROM alerts WHERE monitor_id = ${monitorId} AND resolved_at IS NULL LIMIT 1
  `;
  return alert ?? null;
}

export async function createAlert(monitorId: string): Promise<void> {
  await sql`INSERT INTO alerts (monitor_id) VALUES (${monitorId})`;
}

export async function autoResolveAlert(alertId: string): Promise<void> {
  await sql`UPDATE alerts SET resolved_at = NOW() WHERE id = ${alertId}`;
}
