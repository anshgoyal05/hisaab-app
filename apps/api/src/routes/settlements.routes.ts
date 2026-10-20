import { FastifyInstance } from 'fastify';
import { createSettlementSchema } from '@hisaab/shared';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { withUserContext } from '../db/rls.js';
import { decryptField, encryptField } from '../crypto/encryption.js';

export async function settlementRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/v1/settlements - Record a settlement
  fastify.post('/', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;

    const parseResult = createSettlementSchema.safeParse(request.body);
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

    // Idempotency check
    const existing = await withUserContext(prisma, userId, async (tx) => {
      return tx.settlement.findFirst({
        where: { userId, clientId: data.clientId },
      });
    });

    if (existing) {
      return reply.send({
        message: 'Settlement already recorded',
        settlement: existing,
      });
    }

    const noteEnc = data.note ? encryptField(data.note, dek) : null;

    const settlement = await withUserContext(prisma, userId, async (tx) => {
      const created = await tx.settlement.create({
        data: {
          clientId: data.clientId,
          userId,
          personId: data.personId,
          direction: data.direction,
          amountMinor: BigInt(data.amountMinor),
          paymentMethod: data.paymentMethod,
          settledOn: new Date(data.settledOn),
          noteEnc,
        },
        include: { person: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          entityType: 'settlement',
          entityId: created.id,
          action: 'CREATE',
          version: 1,
          diffSummary: `Recorded settlement of ${data.amountMinor} paise with direction ${data.direction}`,
        },
      });

      return created;
    });

    return reply.status(201).send({
      message: 'Settlement recorded successfully',
      settlement: {
        id: settlement.id,
        clientId: settlement.clientId,
        direction: settlement.direction,
        amountMinor: Number(settlement.amountMinor),
        settledOn: settlement.settledOn,
        paymentMethod: settlement.paymentMethod,
      },
    });
  });

  // GET /api/v1/settlements - List settlements
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const dek = request.user!.dek;

    const settlements = await withUserContext(prisma, userId, async (tx) => {
      return tx.settlement.findMany({
        where: { userId, deletedAt: null },
        include: { person: true },
        orderBy: { settledOn: 'desc' },
      });
    });

    const decrypted = settlements.map((s: any) => {
      let note: string | null = null;
      if (s.noteEnc) {
        try {
          note = decryptField(s.noteEnc, dek);
        } catch {}
      }

      let personName = 'Friend';
      if (s.person?.nameEnc) {
        try {
          personName = decryptField(s.person.nameEnc, dek);
        } catch {}
      }

      return {
        id: s.id,
        clientId: s.clientId,
        personId: s.personId,
        personName,
        direction: s.direction,
        amountMinor: Number(s.amountMinor),
        paymentMethod: s.paymentMethod,
        settledOn: s.settledOn,
        note,
      };
    });

    return reply.send({ settlements: decrypted });
  });
}
