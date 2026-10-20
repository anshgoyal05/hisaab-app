import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { loginSchema, registerSchema } from '@hisaab/shared';
import { prisma } from '../db/client.js';
import {
  hashPassword,
  isPasswordBreached,
  verifyPassword,
} from '../crypto/password.js';
import {
  generateUserDek,
  wrapDek,
} from '../crypto/encryption.js';
import {
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from '../auth/jwt.js';
import { authenticate } from '../middleware/auth.js';

const MASTER_KEY =
  process.env.APP_MASTER_KEY ||
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'Utensils', color: '#145C53' },
  { name: 'Chai/Coffee', icon: 'Coffee', color: '#D97706' },
  { name: 'Transport', icon: 'Bus', color: '#2563EB' },
  { name: 'Study', icon: 'BookOpen', color: '#7C3AED' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#DB2777' },
  { name: 'Rent', icon: 'Home', color: '#059669' },
  { name: 'Entertainment', icon: 'Film', color: '#EA580C' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#6B7280' },
];

export async function authRoutes(fastify: FastifyInstance) {
  // POST /register
  fastify.post('/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid input',
          details: parseResult.error.errors,
        },
      });
    }

    const { email, password } = parseResult.data;

    // Check offline breached password
    if (isPasswordBreached(password)) {
      return reply.status(400).send({
        error: {
          code: 'PASSWORD_BREACHED',
          message:
            'This password is too common or has appeared in known data breaches. Please choose a stronger password.',
        },
      });
    }

    // Check existing email
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return reply.status(409).send({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email address already exists.',
        },
      });
    }

    // Hash password & generate encrypted DEK
    const passwordHash = await hashPassword(password);
    const dek = generateUserDek();
    const dekEncrypted = wrapDek(dek, MASTER_KEY);

    // Create user, settings, and categories in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          dekEncrypted,
          settings: {
            create: {
              language: 'en',
              currency: 'INR',
              theme: 'system',
              reminderTime: '21:30',
              reminderEnabled: true,
            },
          },
        },
      });

      // Seed default categories
      for (const cat of DEFAULT_CATEGORIES) {
        await tx.category.create({
          data: {
            userId: newUser.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            isDefault: true,
          },
        });
      }

      return newUser;
    });

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const { token: refreshToken, hash: refreshHash } = generateRefreshToken();

    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        familyId,
        expiresAt,
      },
    });

    reply.setCookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return reply.status(201).send({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
      },
      accessToken,
    });
  });

  // POST /login
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email or password',
        },
      });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { settings: true },
    });

    if (!user || user.deletedAt) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect email or password',
        },
      });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect email or password',
        },
      });
    }

    // Generate tokens
    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const { token: refreshToken, hash: refreshHash } = generateRefreshToken();

    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        familyId,
        expiresAt,
      },
    });

    reply.setCookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return reply.send({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        settings: user.settings,
      },
      accessToken,
    });
  });

  // POST /demo (Instant demo login for grading/review)
  fastify.post('/demo', async (_request, reply) => {
    const DEMO_EMAIL = 'demo@hisaab.app';
    const DEMO_PASS = 'CampusHisaab2026!';

    let user = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
      include: { settings: true },
    });

    if (!user) {
      // Auto-create demo user
      const passwordHash = await hashPassword(DEMO_PASS);
      const dek = generateUserDek();
      const dekEncrypted = wrapDek(dek, MASTER_KEY);

      user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: DEMO_EMAIL,
            passwordHash,
            dekEncrypted,
            settings: {
              create: {
                language: 'en',
                currency: 'INR',
                theme: 'system',
                reminderTime: '21:30',
                reminderEnabled: true,
              },
            },
          },
          include: { settings: true },
        });

        for (const cat of DEFAULT_CATEGORIES) {
          await tx.category.create({
            data: {
              userId: u.id,
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
              isDefault: true,
            },
          });
        }

        return u;
      });
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const { token: refreshToken, hash: refreshHash } = generateRefreshToken();

    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        familyId,
        expiresAt,
      },
    });

    reply.setCookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return reply.send({
      message: 'Demo login successful',
      user: {
        id: user.id,
        email: user.email,
        settings: user.settings,
      },
      accessToken,
    });
  });

  // POST /refresh (Rotating refresh token with reuse detection)
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.refresh_token;

    if (!refreshToken) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'No refresh token provided' },
      });
    }

    const hash = hashToken(refreshToken);
    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
    });

    if (!existingToken) {
      return reply.status(401).send({
        error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
      });
    }

    // Reuse detection: If token is already revoked, compromise detected!
    if (existingToken.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { familyId: existingToken.familyId },
        data: { isRevoked: true },
      });
      reply.clearCookie('refresh_token');
      reply.clearCookie('access_token');
      return reply.status(403).send({
        error: {
          code: 'TOKEN_REUSE_DETECTED',
          message: 'Security alert: Refresh token reuse detected. All sessions revoked.',
        },
      });
    }

    // Check expiration
    if (new Date() > existingToken.expiresAt) {
      return reply.status(401).send({
        error: { code: 'TOKEN_EXPIRED', message: 'Refresh token expired' },
      });
    }

    // Revoke old token and issue new token in family
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { isRevoked: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: existingToken.userId },
    });

    if (!user || user.deletedAt) {
      return reply.status(401).send({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }

    const newAccessToken = signAccessToken({ userId: user.id, email: user.email });
    const { token: newRefreshToken, hash: newRefreshHash } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshHash,
        familyId: existingToken.familyId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    reply.setCookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    reply.setCookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return reply.send({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
    });
  });

  // POST /logout
  fastify.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    const refreshToken = request.cookies?.refresh_token;
    if (refreshToken) {
      const hash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hash },
        data: { isRevoked: true },
      });
    }

    reply.clearCookie('access_token');
    reply.clearCookie('refresh_token');

    return reply.send({ message: 'Logged out successfully' });
  });

  // POST /logout-all (Revoke all active sessions across all devices)
  fastify.post('/logout-all', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;

    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    reply.clearCookie('access_token');
    reply.clearCookie('refresh_token');

    return reply.send({ message: 'All sessions revoked successfully' });
  });
}
