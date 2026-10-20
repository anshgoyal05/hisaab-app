import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { withUserContext } from '../db/rls.js';
import {
  calculateNetBalances,
  calculateOverallBalances,
} from '@hisaab/shared';
import { decryptField } from '../crypto/encryption.js';

export async function balanceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/balances - Overall balances and friend breakdown
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;

    const result = await withUserContext(prisma, userId, async (tx) => {
      const transactions = await tx.transaction.findMany({
        where: { userId, deletedAt: null },
        include: { splits: true },
      });

      const settlements = await tx.settlement.findMany({
        where: { userId, deletedAt: null },
      });

      const people = await tx.person.findMany({
        where: { userId, deletedAt: null },
      });

      const txForBalance = transactions.map((t: any) => ({
        id: t.id,
        payerId: t.payerType === 'me' ? 'me' : t.payerPersonId || '',
        totalMinor: Number(t.totalMinor),
        splits: t.splits.map((s: any) => ({
          participantId: s.participantType === 'me' ? 'me' : s.personId || '',
          shareMinor: Number(s.shareMinor),
        })),
        deletedAt: t.deletedAt,
      }));

      const settlementsForBalance = settlements.map((s: any) => ({
        id: s.id,
        fromPersonId: s.direction === 'they_paid_me' ? s.personId : 'me',
        toPersonId: s.direction === 'they_paid_me' ? 'me' : s.personId,
        amountMinor: Number(s.amountMinor),
        deletedAt: s.deletedAt,
      }));

      const balanceMap = calculateNetBalances(
        txForBalance,
        settlementsForBalance,
        'me'
      );
      const overall = calculateOverallBalances(balanceMap);

      const friendBalances = people.map((p: any) => {
        let name = 'Friend';
        try {
          name = decryptField(p.nameEnc, dek);
        } catch {}

        const b = balanceMap.get(p.id) || {
          netBalanceMinor: 0,
          theyOweMeMinor: 0,
          iOweThemMinor: 0,
          status: 'settled',
        };

        return {
          personId: p.id,
          name,
          avatarColor: p.avatarColor,
          netBalanceMinor: b.netBalanceMinor,
          theyOweMeMinor: b.theyOweMeMinor,
          iOweThemMinor: b.iOweThemMinor,
          status: b.status,
        };
      });

      return {
        overall,
        friendBalances,
      };
    });

    return reply.send(result);
  });
}
