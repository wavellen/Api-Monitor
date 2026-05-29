import { FastifyRequest, FastifyReply } from 'fastify';
import type { RegisterBody, LoginBody } from '../types';
import { registerUser, loginUser, logoutUser, refreshTokens } from '../services/auth.service';

const ERROR_MAP: Record<string, { status: number; label: string }> = {
  'Email already exists': { status: 409, label: 'Conflict' },
  'Username already exists': { status: 409, label: 'Conflict' },
  'Invalid credentials': { status: 401, label: 'Unauthorized' },
  'Invalid token': { status: 401, label: 'Unauthorized' },
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

export async function registerHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await registerUser(request.body as RegisterBody);
    reply.status(201).send({ message: 'Account created' });
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const result = await loginUser(request.body as LoginBody);
    reply.send({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or missing token',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const { refreshToken } = request.body as { refreshToken?: string };

  try {
    await Promise.all([
      logoutUser(token),
      refreshToken ? logoutUser(refreshToken) : Promise.resolve(),
    ]);
    reply.send({ message: 'Logged out' });
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}

export async function refreshHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const { refreshToken } = request.body as { refreshToken: string };
    const result = await refreshTokens(refreshToken);
    reply.send({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (error: unknown) {
    handleServiceError(reply, error);
  }
}
