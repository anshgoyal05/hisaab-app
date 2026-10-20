import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { withUserContext } from '../db/rls.js';
import { decryptField } from '../crypto/encryption.js';

export async function reminderRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/reminders/night-review - Night review of today's expenses
  fastify.get('/night-review', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const result = await withUserContext(prisma, userId, async (tx) => {
      const todayTransactions = await tx.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          occurredOn: { gte: startOfToday, lte: endOfToday },
        },
        include: { category: true, splits: true },
        orderBy: { createdAt: 'desc' },
      });

      let todayTotalSpendMinor = 0;
      const items = todayTransactions.map((t: any) => {
        let note: string | null = null;
        if (t.noteEnc) {
          try {
            note = decryptField(t.noteEnc, dek);
          } catch {}
        }

        const mySplit = t.splits.find((s: any) => s.participantType === 'me');
        const myShare = mySplit ? Number(mySplit.shareMinor) : 0;
        todayTotalSpendMinor += myShare;

        return {
          id: t.id,
          category: t.category.name,
          categoryIcon: t.category.icon,
          categoryColor: t.category.color,
          totalMinor: Number(t.totalMinor),
          myShareMinor: myShare,
          note,
          paymentMethod: t.paymentMethod,
        };
      });

      return {
        date: startOfToday.toISOString().split('T')[0],
        todayTotalSpendMinor,
        transactionCount: items.length,
        items,
        isCompleted: items.length > 0,
        message:
          items.length > 0
            ? "You've recorded today's expenses! Start tomorrow with a clear head."
            : 'No expenses logged today. Did you buy chai, snacks, or bus tickets?',
      };
    });

    return reply.send(result);
  });

  // POST /api/v1/reminders/subscribe - Register Web Push subscription
  fastify.post('/subscribe', async (request, reply) => {
    const userId = request.user!.id;
    const { endpoint, keys } = request.body as any;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid push subscription' },
      });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return reply.send({ message: 'Push notification subscription registered' });
  });
}
