import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../auth/jwt.js';
import { prisma } from '../db/client.js';
import { unwrapDek } from '../crypto/encryption.js';

const MASTER_KEY =
  process.env.APP_MASTER_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      dek: Buffer;
    };
  }
}

/**
 * Authentication middleware verifying JWT access token and hydrating
 * the authenticated user context along with their in-memory decrypted DEK.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies?.access_token) {
      token = request.cookies.access_token;
    }

    if (!token) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.',
        },
      });
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, dekEncrypted: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      return reply.status(401).send({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account does not exist or has been deleted.',
        },
      });
    }

    // Unwrap the user's DEK in memory for envelope encryption
    const dek = unwrapDek(user.dekEncrypted, MASTER_KEY);

    request.user = {
      id: user.id,
      email: user.email,
      dek,
    };
  } catch (err) {
    return reply.status(401).send({
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid or expired session. Please log in again.',
      },
    });
  }
}
