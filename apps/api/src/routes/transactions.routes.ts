import { FastifyInstance } from 'fastify';
import { createTransactionSchema } from '@hisaab/shared';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { withUserContext } from '../db/rls.js';
import { decryptField, encryptField } from '../crypto/encryption.js';

export async function transactionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/transactions - List transactions with filters
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;
    const query = request.query as any;

    const {
      startDate,
      endDate,
      categoryId,
      personId,
      paymentMethod,
      type,
      limit = '50',
      offset = '0',
    } = query;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.occurredOn = {};
      if (startDate) where.occurredOn.gte = new Date(startDate);
      if (endDate) where.occurredOn.lte = new Date(endDate);
    }

    if (categoryId) where.categoryId = categoryId;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (type) where.type = type;

    if (personId) {
      where.OR = [
        { payerPersonId: personId },
        { splits: { some: { personId } } },
      ];
    }

    const [transactions, totalCount] = await withUserContext(
      prisma,
      userId,
      async (tx) => {
        const items = await tx.transaction.findMany({
          where,
          include: {
            category: true,
            payerPerson: true,
            splits: {
              include: {
                person: true,
              },
            },
          },
          orderBy: { occurredOn: 'desc' },
          take: parseInt(limit, 10),
          skip: parseInt(offset, 10),
        });

        const count = await tx.transaction.count({ where });
        return [items, count];
      }
    );

    // Decrypt notes and person names
    const decrypted = transactions.map((t: any) => {
      let note: string | null = null;
      if (t.noteEnc) {
        try {
          note = decryptField(t.noteEnc, dek);
        } catch {}
      }

      let payerName = t.payerType === 'me' ? 'You' : 'Friend';
      if (t.payerPerson?.nameEnc) {
        try {
          payerName = decryptField(t.payerPerson.nameEnc, dek);
        } catch {}
      }

      const splits = t.splits.map((s: any) => {
        let personName = s.participantType === 'me' ? 'You' : 'Friend';
        if (s.person?.nameEnc) {
          try {
            personName = decryptField(s.person.nameEnc, dek);
          } catch {}
        }
        return {
          id: s.id,
          participantType: s.participantType,
          personId: s.personId,
          personName,
          shareMinor: Number(s.shareMinor),
        };
      });

      return {
        id: t.id,
        clientId: t.clientId,
        type: t.type,
        payerType: t.payerType,
        payerPersonId: t.payerPersonId,
        payerName,
        totalMinor: Number(t.totalMinor),
        currency: t.currency,
        category: t.category,
        paymentMethod: t.paymentMethod,
        occurredOn: t.occurredOn,
        note,
        splitMode: t.splitMode,
        version: t.version,
        splits,
        createdAt: t.createdAt,
      };
    });

    return reply.send({
      transactions: decrypted,
      totalCount,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  });

  // POST /api/v1/transactions - Create transaction (Idempotent via client_id)
  fastify.post('/', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;

    const parseResult = createTransactionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid input',
          details: parseResult.error.errors,
        },
      });
    }

    const data = parseResult.data;

    // Check for existing transaction by clientId (Idempotency)
    const existing = await withUserContext(prisma, userId, async (tx) => {
      return tx.transaction.findUnique({
        where: {
          userId_clientId: {
            userId,
            clientId: data.clientId,
          },
        },
        include: { splits: true, category: true },
      });
    });

    if (existing) {
      return reply.status(200).send({
        message: 'Transaction already processed (idempotent response)',
        transaction: {
          id: existing.id,
          clientId: existing.clientId,
          totalMinor: Number(existing.totalMinor),
        },
      });
    }

    // Encrypt note if present
    const noteEnc = data.note ? encryptField(data.note, dek) : null;

    const createdTx = await withUserContext(prisma, userId, async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          clientId: data.clientId,
          userId,
          type: data.type,
          payerType: data.payerType,
          payerPersonId: data.payerType === 'person' ? data.payerPersonId : null,
          totalMinor: BigInt(data.totalMinor),
          currency: data.currency,
          categoryId: data.categoryId,
          paymentMethod: data.paymentMethod,
          occurredOn: new Date(data.occurredOn),
          noteEnc,
          splitMode: data.splitMode,
          version: 1,
          splits: {
            create: data.splits.map((s) => ({
              participantType: s.participantId === 'me' ? 'me' : 'person',
              personId: s.participantId === 'me' ? null : s.participantId,
              shareMinor: BigInt(s.shareMinor),
            })),
          },
        },
        include: { splits: true, category: true },
      });

      // Audit log entry
      await tx.auditLog.create({
        data: {
          userId,
          entityType: 'transaction',
          entityId: newTx.id,
          action: 'CREATE',
          version: 1,
          diffSummary: `Created ${data.type} expense of ${data.totalMinor} paise`,
        },
      });

      return newTx;
    });

    return reply.status(201).send({
      message: 'Transaction created successfully',
      transaction: {
        id: createdTx.id,
        clientId: createdTx.clientId,
        type: createdTx.type,
        totalMinor: Number(createdTx.totalMinor),
        occurredOn: createdTx.occurredOn,
        note: data.note,
        category: createdTx.category,
      },
    });
  });

  // DELETE /api/v1/transactions/:id - Soft-delete transaction with audit trail
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    await withUserContext(prisma, userId, async (tx) => {
      const txRecord = await tx.transaction.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!txRecord) {
        return;
      }

      await tx.transaction.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId,
          entityType: 'transaction',
          entityId: id,
          action: 'SOFT_DELETE',
          version: txRecord.version + 1,
          diffSummary: `Soft-deleted transaction of ${txRecord.totalMinor} paise`,
        },
      });
    });

    return reply.send({ message: 'Transaction deleted successfully' });
  });
}
