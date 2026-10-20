import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { withUserContext } from '../db/rls.js';
import { calculatePersonalSpending, formatMoney } from '@hisaab/shared';
import { decryptField } from '../crypto/encryption.js';

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/reports/summary
  fastify.get('/summary', async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as any;

    const { range = 'month', startDate, endDate } = query;

    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    if (range === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (range === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (range === 'custom' && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    }

    const result = await withUserContext(prisma, userId, async (tx) => {
      const transactions = await tx.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          occurredOn: {
            gte: start,
            lte: end,
          },
        },
        include: { splits: true, category: true },
        orderBy: { occurredOn: 'desc' },
      });

      const settlements = await tx.settlement.findMany({
        where: {
          userId,
          deletedAt: null,
          settledOn: {
            gte: start,
            lte: end,
          },
        },
      });

      // Format for calculatePersonalSpending
      const txForSpending = transactions.map((t: any) => ({
        id: t.id,
        type: t.type,
        payerId: t.payerType === 'me' ? 'me' : t.payerPersonId || '',
        categoryId: t.category.name,
        occurredOn: t.occurredOn.toISOString().split('T')[0],
        totalMinor: Number(t.totalMinor),
        splits: t.splits.map((s: any) => ({
          participantId: s.participantType === 'me' ? 'me' : s.personId || '',
          shareMinor: Number(s.shareMinor),
        })),
        deletedAt: t.deletedAt,
      }));

      const settlementsForSpending = settlements.map((s: any) => ({
        id: s.id,
        amountMinor: Number(s.amountMinor),
        settledOn: s.settledOn.toISOString().split('T')[0],
        deletedAt: s.deletedAt,
      }));

      const spending = calculatePersonalSpending(
        txForSpending,
        settlementsForSpending,
        'me'
      );

      // Top 5 personal expenses
      const topExpenses = transactions
        .map((t: any) => {
          const mySplit = t.splits.find((s: any) => s.participantType === 'me');
          const myShare = mySplit ? Number(mySplit.shareMinor) : 0;
          return {
            id: t.id,
            category: t.category.name,
            totalMinor: Number(t.totalMinor),
            myShareMinor: myShare,
            occurredOn: t.occurredOn,
          };
        })
        .filter((t: any) => t.myShareMinor > 0)
        .sort((a: any, b: any) => b.myShareMinor - a.myShareMinor)
        .slice(0, 5);

      return {
        range,
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        },
        myPersonalSpendMinor: spending.myPersonalSpendMinor,
        receivablesCreatedMinor: spending.receivablesCreatedMinor,
        byCategory: spending.byCategoryMinor,
        byDate: spending.byDateMinor,
        topExpenses,
        transactionCount: transactions.length,
      };
    });

    return reply.send(result);
  });

  // GET /api/v1/reports/export - Export transactions as CSV
  fastify.get('/export', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;

    const transactions = await withUserContext(prisma, userId, async (tx) => {
      return tx.transaction.findMany({
        where: { userId, deletedAt: null },
        include: { category: true, splits: true },
        orderBy: { occurredOn: 'desc' },
      });
    });

    let csv = 'Date,Type,Category,Total (INR),My Share (INR),Payment Method,Note\n';

    for (const t of transactions) {
      let note = '';
      if (t.noteEnc) {
        try {
          note = decryptField(t.noteEnc, dek).replace(/,/g, ' ');
        } catch {}
      }

      const mySplit = t.splits.find((s: any) => s.participantType === 'me');
      const myShare = mySplit ? Number(mySplit.shareMinor) / 100 : 0;
      const total = Number(t.totalMinor) / 100;
      const date = t.occurredOn.toISOString().split('T')[0];

      csv += `${date},${t.type},${t.category.name},${total},${myShare},${t.paymentMethod},"${note}"\n`;
    }

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="hisaab-report.csv"');
    return reply.send(csv);
  });
}
