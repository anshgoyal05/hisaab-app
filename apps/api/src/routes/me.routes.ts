import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { verifyPassword } from '../crypto/password.js';

export async function meRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/me - Profile
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
        settings: user.settings,
        createdAt: user.createdAt,
      },
    });
  });

  // GET /api/v1/me/export - Full data export (JSON of all user records)
  fastify.get('/export', async (request, reply) => {
    const userId = request.user!.id;

    const [user, people, transactions, settlements, budgets] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { settings: true },
      }),
      prisma.person.findMany({ where: { userId } }),
      prisma.transaction.findMany({
        where: { userId },
        include: { splits: true, category: true },
      }),
      prisma.settlement.findMany({ where: { userId } }),
      prisma.budget.findMany({ where: { userId } }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        settings: user?.settings,
      },
      friendsCount: people.length,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        totalMinor: Number(t.totalMinor),
        occurredOn: t.occurredOn,
        category: t.category.name,
        paymentMethod: t.paymentMethod,
        splits: t.splits.map((s) => ({
          shareMinor: Number(s.shareMinor),
          participantType: s.participantType,
        })),
      })),
      settlements: settlements.map((s) => ({
        id: s.id,
        direction: s.direction,
        amountMinor: Number(s.amountMinor),
        settledOn: s.settledOn,
      })),
      budgets: budgets.map((b) => ({
        month: b.month,
        limitMinor: Number(b.limitMinor),
      })),
    };

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 'attachment; filename="hisaab-my-data.json"');
    return reply.send(exportData);
  });

  // DELETE /api/v1/me - Permanent Account Deletion (Hard delete confirmed with password)
  fastify.delete('/', async (request, reply) => {
    const userId = request.user!.id;
    const { password } = request.body as { password?: string };

    if (!password) {
      return reply.status(400).send({
        error: {
          code: 'PASSWORD_REQUIRED',
          message: 'Password confirmation is required to permanently delete your account.',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Incorrect password. Account deletion aborted.',
        },
      });
    }

    // Hard-delete: CASCADE removes user and all foreign-key associated records
    await prisma.user.delete({
      where: { id: userId },
    });

    reply.clearCookie('access_token');
    reply.clearCookie('refresh_token');

    return reply.send({
      message: 'Account and all financial data permanently deleted.',
    });
  });
}
