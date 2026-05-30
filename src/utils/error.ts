import { FastifyReply } from 'fastify';

export const ERROR_MAP: Record<string, { status: number; label: string }> = {
  'Monitor not found': { status: 404, label: 'Not Found' },
  'Check not found': { status: 404, label: 'Not Found' },
  'Alert not found': { status: 404, label: 'Not Found' },
  'Alert already resolved': { status: 409, label: 'Conflict' },
  'Monitor limit reached': { status: 429, label: 'Too Many Requests' },
  'Email already exists': { status: 409, label: 'Conflict' },
  'Username already exists': { status: 409, label: 'Conflict' },
  'Invalid credentials': { status: 401, label: 'Unauthorized' },
  'Invalid token': { status: 401, label: 'Unauthorized' },
};

export function handleServiceError(reply: FastifyReply, error: unknown): void {
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
