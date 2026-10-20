import { FastifyInstance } from 'fastify';
import { setBudgetSchema } from '@hisaab/shared';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { withUserContext } from '../db/rls.js';

export async function budgetRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/budgets - Get budgets with current month spend
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = await withUserContext(prisma, userId, async (tx) => {
      const budgets = await tx.budget.findMany({
        where: { userId, month: currentMonth },
        include: { category: true },
      });

      // Calculate monthly personal spending
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const transactions = await tx.transaction.findMany({
        where: {
          userId,
          deletedAt: null,
          occurredOn: { gte: startOfMonth, lte: endOfMonth },
        },
        include: { splits: true },
      });

      let totalMonthSpendMinor = 0;
      const spendByCategory: Record<string, number> = {};

      for (const t of transactions) {
        const mySplit = t.splits.find((s: any) => s.participantType === 'me');
        const myShare = mySplit ? Number(mySplit.shareMinor) : 0;
        if (myShare > 0) {
          totalMonthSpendMinor += myShare;
          spendByCategory[t.categoryId] =
            (spendByCategory[t.categoryId] ?? 0) + myShare;
        }
      }

      const overallBudget = budgets.find((b: any) => b.categoryId === null);
      const overallLimit = overallBudget ? Number(overallBudget.limitMinor) : null;
      const overallPercentage = overallLimit
        ? Math.round((totalMonthSpendMinor / overallLimit) * 100)
        : null;

      const categoryBudgets = budgets
        .filter((b: any) => b.categoryId !== null)
        .map((b: any) => {
          const spent = spendByCategory[b.categoryId!] || 0;
          const limit = Number(b.limitMinor);
          const percent = Math.round((spent / limit) * 100);
          return {
            id: b.id,
            categoryId: b.categoryId,
            categoryName: b.category?.name || 'Category',
            limitMinor: limit,
            spentMinor: spent,
            percentage: percent,
            isWarning: percent >= 80 && percent < 100,
            isExceeded: percent >= 100,
          };
        });

      return {
        month: currentMonth,
        overall: {
          limitMinor: overallLimit,
          spentMinor: totalMonthSpendMinor,
          percentage: overallPercentage,
          isWarning: overallPercentage ? overallPercentage >= 80 && overallPercentage < 100 : false,
          isExceeded: overallPercentage ? overallPercentage >= 100 : false,
        },
        categoryBudgets,
      };
    });

    return reply.send(result);
  });

  // PUT /api/v1/budgets - Set or update a budget
  fastify.put('/', async (request, reply) => {
    const userId = request.user!.id;

    const parseResult = setBudgetSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid input',
        },
      });
    }

    const { categoryId, month, limitMinor } = parseResult.data;

    const budget = await withUserContext(prisma, userId, async (tx) => {
      // Find existing
      const existing = await tx.budget.findFirst({
        where: {
          userId,
          month,
          categoryId: categoryId || null,
        },
      });

      if (existing) {
        return tx.budget.update({
          where: { id: existing.id },
          data: { limitMinor: BigInt(limitMinor) },
        });
      }

      return tx.budget.create({
        data: {
          userId,
          categoryId: categoryId || null,
          month,
          limitMinor: BigInt(limitMinor),
        },
      });
    });

    return reply.send({
      message: 'Budget saved successfully',
      budget: {
        id: budget.id,
        month: budget.month,
        limitMinor: Number(budget.limitMinor),
      },
    });
  });
}
