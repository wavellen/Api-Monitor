import { sql } from '../config/db';
import type { Check, PaginatedChecks } from '../types';

export async function getChecks(
  monitorId: string,
  userId: string,
  page: number,
  limit: number,
): Promise<PaginatedChecks> {
  const [monitor] = await sql<[{ id: string }]>`
    SELECT id FROM monitors WHERE id = ${monitorId} AND user_id = ${userId}
  `;

  if (!monitor) {
    throw new Error('Monitor not found');
  }

  const offset = (page - 1) * limit;

  const rows = await sql<(Check & { total_count: number })[]>`
    SELECT id, monitor_id, status, response_time_ms,
           failure_reason, status_code_received, checked_at,
           COUNT(*) OVER()::int AS total_count
    FROM checks
    WHERE monitor_id = ${monitorId}
    ORDER BY checked_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const total = rows[0]?.total_count ?? 0;
  const data: Check[] = rows.map(({ total_count, ...check }) => check);

  return {
    data,
    pagination: { total, page, limit },
  };
}

export async function getCheckById(
  monitorId: string,
  checkId: string,
  userId: string,
): Promise<Check> {
  const [monitor] = await sql<[{ id: string }]>`
    SELECT id FROM monitors WHERE id = ${monitorId} AND user_id = ${userId}
  `;

  if (!monitor) {
    throw new Error('Monitor not found');
  }

  const [check] = await sql<Check[]>`
    SELECT id, monitor_id, status, response_time_ms,
           failure_reason, status_code_received, checked_at
    FROM checks
    WHERE id = ${checkId} AND monitor_id = ${monitorId}
  `;

  if (!check) {
    throw new Error('Check not found');
  }

  return check;
}
