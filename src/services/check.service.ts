import { sql } from '../config/db';
import type { Check, CheckResponse, CheckStatus, PaginatedChecks } from '../types';

export async function getChecks(
  monitorId: string,
  userId: string,
  page: number,
  limit: number,
  from?: Date,
  to?: Date,
): Promise<PaginatedChecks> {
  const offset = (page - 1) * limit;

  const fromFilter = from ? sql`AND c.checked_at >= ${from}` : sql``;
  const toFilter = to ? sql`AND c.checked_at <= ${to}` : sql``;

  const rows = await sql<(Omit<Check, 'monitor_id'> & { total_count: number })[]>`
    SELECT c.id, c.status, c.response_time_ms,
           c.failure_reason, c.status_code_received, c.checked_at,
           COUNT(*) OVER()::int AS total_count
    FROM checks c
    JOIN monitors m ON m.id = c.monitor_id AND m.user_id = ${userId}
    WHERE c.monitor_id = ${monitorId}
    ${fromFilter}
    ${toFilter}
    ORDER BY c.checked_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  if (rows.length === 0) {
    const [monitor] = await sql<[{ id: string }]>`
      SELECT id FROM monitors WHERE id = ${monitorId} AND user_id = ${userId}
    `;
    if (!monitor) throw new Error('Monitor not found');

    const [{ count }] = await sql<[{ count: number }]>`
      SELECT COUNT(*)::int as count
      FROM checks c
      JOIN monitors m ON m.id = c.monitor_id AND m.user_id = ${userId}
      WHERE c.monitor_id = ${monitorId}
      ${fromFilter}
      ${toFilter}
    `;
    return { data: [], pagination: { total: count, page, limit } };
  }

  const total = rows[0].total_count;
  const data: CheckResponse[] = rows.map(({ total_count: _, ...check }) => check as CheckResponse);

  return { data, pagination: { total, page, limit } };
}

export async function getCheckById(
  monitorId: string,
  checkId: string,
  userId: string,
): Promise<CheckResponse> {
  const [row] = await sql<CheckResponse[]>`
    SELECT c.id, c.status, c.response_time_ms,
           c.failure_reason, c.status_code_received, c.checked_at
    FROM checks c
    JOIN monitors m ON m.id = c.monitor_id
    WHERE c.id = ${checkId} AND c.monitor_id = ${monitorId}
    AND m.user_id = ${userId}
  `;

  if (!row) throw new Error('Check not found');
  return row;
}

export async function createCheck(data: {
  monitor_id: string;
  status: CheckStatus;
  response_time_ms: number | null;
  status_code_received: number | null;
  failure_reason: string | null;
}): Promise<void> {
  await sql`
    INSERT INTO checks (monitor_id, status, response_time_ms, status_code_received, failure_reason)
    VALUES (${data.monitor_id}, ${data.status}, ${data.response_time_ms}, ${data.status_code_received}, ${data.failure_reason})
  `;
}

export async function getLastNChecks(
  monitorId: string,
  n: number,
): Promise<{ status: CheckStatus }[]> {
  return sql<{ status: CheckStatus }[]>`
    SELECT status FROM checks
    WHERE monitor_id = ${monitorId}
    ORDER BY checked_at DESC LIMIT ${n}
  `;
}
