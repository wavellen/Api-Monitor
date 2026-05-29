import { scrypt, randomBytes, randomUUID, timingSafeEqual, type ScryptOptions } from 'crypto';
import jwt from 'jsonwebtoken';
import { PostgresError } from 'postgres';
import { sql } from '../config/db';
import { redis } from '../config/redis';
import { config } from '../config/env';
import type { RegisterBody, LoginBody } from '../types';

function scryptHash(password: string, salt: string, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function registerUser(body: RegisterBody): Promise<void> {
  const salt = randomBytes(32).toString('hex');
  const derivedKey = await scryptHash(body.password, salt, 64, { N: 16384, r: 8, p: 1 });
  const passwordHash = `${salt}:${derivedKey.toString('hex')}`;

  try {
    await sql`
      INSERT INTO users (email, username, password_hash)
      VALUES (${body.email}, ${body.username}, ${passwordHash})
    `;
  } catch (error: unknown) {
    if (error instanceof PostgresError && error.code === '23505') {
      const pgError = error as PostgresError & { constraint: string };
      if (pgError.constraint === 'users_email_key') {
        throw new Error('Email already exists');
      }
      if (pgError.constraint === 'users_username_key') {
        throw new Error('Username already exists');
      }
    }
    throw error;
  }
}

export async function loginUser(body: LoginBody): Promise<{ accessToken: string; refreshToken: string }> {
  const [user] = await sql<Array<{ id: string; email: string; password_hash: string }>>`
    SELECT id, email, password_hash FROM users WHERE email = ${body.email} AND deleted_at IS NULL
  `;

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const [salt, storedHash] = user.password_hash.split(':');
  const derivedKey = await scryptHash(body.password, salt, 64, { N: 16384, r: 8, p: 1 });

  const derivedKeyHex = Buffer.from(derivedKey.toString('hex'));
  const storedHashBuffer = Buffer.from(storedHash);

  if (!timingSafeEqual(derivedKeyHex, storedHashBuffer)) {
    throw new Error('Invalid credentials');
  }

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '15m', jwtid: randomUUID() },
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.jwtRefreshSecret,
    { expiresIn: '7d', jwtid: randomUUID() },
  );

  return { accessToken, refreshToken };
}

export async function logoutUser(token: string): Promise<void> {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== 'object' || !decoded.jti || !decoded.exp) {
    throw new Error('Invalid token');
  }

  const remainingTtl = decoded.exp - Math.floor(Date.now() / 1000);
  if (remainingTtl <= 0) {
    return;
  }

  await redis.set(`blocklist:${decoded.jti}`, '1', 'EX', remainingTtl);
}

export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: { userId: string };

  try {
    payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as { userId: string };
  } catch {
    throw new Error('Invalid token');
  }

  const decoded = jwt.decode(refreshToken) as { jti?: string } | null;
  if (decoded?.jti) {
    const blocked = await redis.get(`blocklist:${decoded.jti}`);
    if (blocked !== null) throw new Error('Invalid token');
  }

  const [user] = await sql<Array<{ id: string; email: string }>>`
    SELECT id, email FROM users WHERE id = ${payload.userId} AND deleted_at IS NULL
  `;

  if (!user) {
    throw new Error('Invalid token');
  }

  const newAccessToken = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '15m', jwtid: randomUUID() },
  );

  const newRefreshToken = jwt.sign(
    { userId: user.id },
    config.jwtRefreshSecret,
    { expiresIn: '7d', jwtid: randomUUID() },
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
