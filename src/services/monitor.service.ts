import { sql } from '../config/db';
import type { CreateMonitorBody, MonitorResponse, UpdateMonitorBody } from '../types';

export async function createMonitor(userId: string, body: CreateMonitorBody): Promise<MonitorResponse> {
  const [row] = await sql<MonitorResponse[]>`
    INSERT INTO monitors (user_id, name, url, check_interval_seconds, expected_status_code)
    SELECT ${userId}, ${body.name}, ${body.url},
           ${body.check_interval_seconds}, ${body.expected_status_code}
    WHERE (SELECT COUNT(*) FROM monitors WHERE user_id = ${userId}) < 20
    RETURNING id, name, url, check_interval_seconds, expected_status_code, is_active, created_at
  `;

  if (!row) {
    throw new Error('Monitor limit reached');
  }

  return row;
}

export async function getUserMonitors(userId: string, isActive?: boolean): Promise<MonitorResponse[]> {
  return await sql<MonitorResponse[]>`
    SELECT id, name, url, check_interval_seconds, expected_status_code, is_active, created_at
    FROM monitors
    WHERE user_id = ${userId}
    ${isActive !== undefined ? sql`AND is_active = ${isActive}` : sql``}
    ORDER BY created_at DESC
  `;
}

export async function getMonitorById(userId: string, monitorId: string): Promise<MonitorResponse> {
  const [row] = await sql<MonitorResponse[]>`
    SELECT id, name, url, check_interval_seconds, expected_status_code, is_active, created_at
    FROM monitors
    WHERE id = ${monitorId} AND user_id = ${userId}
  `;

  if (!row) {
    throw new Error('Monitor not found');
  }

  return row;
}

export async function updateMonitor(
  userId: string,
  monitorId: string,
  body: UpdateMonitorBody,
): Promise<MonitorResponse & { prev_is_active: boolean }> {
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.url !== undefined) updates.url = body.url;
  if (body.check_interval_seconds !== undefined) updates.check_interval_seconds = body.check_interval_seconds;
  if (body.expected_status_code !== undefined) updates.expected_status_code = body.expected_status_code;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  updates.updated_at = sql`NOW()`;

  const [row] = await sql<Array<MonitorResponse & { prev_is_active: boolean }>>`
    UPDATE monitors SET ${sql(updates)}
    WHERE id = ${monitorId} AND user_id = ${userId}
    RETURNING id, name, url, check_interval_seconds, expected_status_code,
              is_active, created_at,
              (SELECT is_active FROM monitors WHERE id = ${monitorId}) as prev_is_active
  `;

  if (!row) {
    throw new Error('Monitor not found');
  }

  return row;
}

export async function deleteMonitor(userId: string, monitorId: string): Promise<void> {
  const result = await sql`
    DELETE FROM monitors WHERE id = ${monitorId} AND user_id = ${userId}
    RETURNING id
  `;

  if (result.count === 0) {
    throw new Error('Monitor not found');
  }
}

export async function getMonitorForWorker(
  monitorId: string,
): Promise<{ id: string; url: string; expected_status_code: number; check_interval_seconds: number } | null> {
  const [monitor] = await sql<[{ id: string; url: string; expected_status_code: number; check_interval_seconds: number }]>`
    SELECT id, url, expected_status_code, check_interval_seconds
    FROM monitors WHERE id = ${monitorId} AND is_active = true
  `;
  return monitor ?? null;
}
