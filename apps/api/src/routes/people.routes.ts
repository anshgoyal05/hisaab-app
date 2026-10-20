import { FastifyInstance } from 'fastify';
import { createPersonSchema } from '@hisaab/shared';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { withUserContext } from '../db/rls.js';
import { decryptField, encryptField } from '../crypto/encryption.js';
import { calculateNetBalances } from '@hisaab/shared';

export async function peopleRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/people - List all friends with balances
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;

    const result = await withUserContext(prisma, userId, async (tx) => {
      const people = await tx.person.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch transactions and settlements to compute net balances
      const transactions = await tx.transaction.findMany({
        where: { userId, deletedAt: null },
        include: { splits: true },
      });

      const settlements = await tx.settlement.findMany({
        where: { userId, deletedAt: null },
      });

      // Format for balance calculator
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

      return people.map((p: any) => {
        let name = 'Friend';
        let phone: string | null = null;
        try {
          name = decryptField(p.nameEnc, dek);
          if (p.phoneEnc) phone = decryptField(p.phoneEnc, dek);
        } catch {}

        const b = balanceMap.get(p.id) || {
          netBalanceMinor: 0,
          theyOweMeMinor: 0,
          iOweThemMinor: 0,
          status: 'settled',
        };

        return {
          id: p.id,
          name,
          phone,
          avatarColor: p.avatarColor,
          netBalanceMinor: b.netBalanceMinor,
          status: b.status,
          createdAt: p.createdAt,
        };
      });
    });

    return reply.send({ people: result });
  });

  // POST /api/v1/people - Add a new friend
  fastify.post('/', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;

    const parseResult = createPersonSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid input',
        },
      });
    }

    const { name, phone, notes, avatarColor } = parseResult.data;

    // Encrypt sensitive fields
    const nameEnc = encryptField(name, dek);
    const phoneEnc = phone ? encryptField(phone, dek) : null;
    const notesEnc = notes ? encryptField(notes, dek) : null;

    const person = await withUserContext(prisma, userId, async (tx) => {
      return tx.person.create({
        data: {
          userId,
          nameEnc,
          phoneEnc,
          notesEnc,
          avatarColor: avatarColor || '#145C53',
        },
      });
    });

    return reply.status(201).send({
      person: {
        id: person.id,
        name,
        phone,
        avatarColor: person.avatarColor,
        netBalanceMinor: 0,
        status: 'settled',
        createdAt: person.createdAt,
      },
    });
  });

  // GET /api/v1/people/:id - Person details with balance and full shared history
  fastify.get('/:id', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;
    const { id } = request.params as { id: string };

    const result = await withUserContext(prisma, userId, async (tx) => {
      const person = await tx.person.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!person) {
        return null;
      }

      let name = 'Friend';
      let phone: string | null = null;
      try {
        name = decryptField(person.nameEnc, dek);
        if (person.phoneEnc) phone = decryptField(person.phoneEnc, dek);
      } catch {}

      // Fetch shared transactions where this person is payer or participant
      const transactions = await tx.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          OR: [{ payerPersonId: id }, { splits: { some: { personId: id } } }],
        },
        include: { splits: true, category: true },
        orderBy: { occurredOn: 'desc' },
      });

      const settlements = await tx.settlement.findMany({
        where: { userId, personId: id, deletedAt: null },
        orderBy: { settledOn: 'desc' },
      });

      // Compute balance
      const allTx = await tx.transaction.findMany({
        where: { userId, deletedAt: null },
        include: { splits: true },
      });
      const allSettlements = await tx.settlement.findMany({
        where: { userId, deletedAt: null },
      });

      const txForBalance = allTx.map((t: any) => ({
        id: t.id,
        payerId: t.payerType === 'me' ? 'me' : t.payerPersonId || '',
        totalMinor: Number(t.totalMinor),
        splits: t.splits.map((s: any) => ({
          participantId: s.participantType === 'me' ? 'me' : s.personId || '',
          shareMinor: Number(s.shareMinor),
        })),
        deletedAt: t.deletedAt,
      }));

      const settlementsForBalance = allSettlements.map((s: any) => ({
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
      const b = balanceMap.get(id) || {
        netBalanceMinor: 0,
        theyOweMeMinor: 0,
        iOweThemMinor: 0,
        status: 'settled',
      };

      // Decrypt notes in shared transactions
      const decryptedTx = transactions.map((t: any) => {
        let note: string | null = null;
        if (t.noteEnc) {
          try {
            note = decryptField(t.noteEnc, dek);
          } catch {}
        }
        return {
          id: t.id,
          type: t.type,
          totalMinor: Number(t.totalMinor),
          occurredOn: t.occurredOn,
          category: t.category,
          note,
          splits: t.splits.map((s: any) => ({
            id: s.id,
            participantType: s.participantType,
            personId: s.personId,
            shareMinor: Number(s.shareMinor),
          })),
        };
      });

      return {
        person: {
          id: person.id,
          name,
          phone,
          avatarColor: person.avatarColor,
          netBalanceMinor: b.netBalanceMinor,
          status: b.status,
          createdAt: person.createdAt,
        },
        transactions: decryptedTx,
        settlements: settlements.map((s: any) => ({
          id: s.id,
          direction: s.direction,
          amountMinor: Number(s.amountMinor),
          paymentMethod: s.paymentMethod,
          settledOn: s.settledOn,
        })),
      };
    });

    if (!result) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Friend not found' },
      });
    }

    return reply.send(result);
  });

  // DELETE /api/v1/people/:id - Soft delete
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    await withUserContext(prisma, userId, async (tx) => {
      await tx.person.updateMany({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    });

    return reply.send({ message: 'Friend removed successfully' });
  });
}
