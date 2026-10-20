import { FastifyInstance } from 'fastify';
import { updateSettingsSchema } from '@hisaab/shared';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';
import { withUserContext } from '../db/rls.js';
import { hashPassword } from '../crypto/password.js';

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/settings
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;

    const settings = await withUserContext(prisma, userId, async (tx) => {
      return tx.userSettings.findUnique({
        where: { userId },
      });
    });

    return reply.send({
      settings: {
        language: settings?.language || 'en',
        currency: settings?.currency || 'INR',
        theme: settings?.theme || 'system',
        reminderTime: settings?.reminderTime || '21:30',
        reminderEnabled: settings?.reminderEnabled ?? true,
        pinEnabled: settings?.pinEnabled ?? false,
      },
    });
  });

  // PATCH /api/v1/settings
  fastify.patch('/', async (request, reply) => {
    const userId = request.user!.id;

    const parseResult = updateSettingsSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid input',
        },
      });
    }

    const data = parseResult.data;
    const updateData: any = {};

    if (data.language) updateData.language = data.language;
    if (data.currency) updateData.currency = data.currency;
    if (data.theme) updateData.theme = data.theme;
    if (data.reminderTime) updateData.reminderTime = data.reminderTime;
    if (data.reminderEnabled !== undefined)
      updateData.reminderEnabled = data.reminderEnabled;

    if (data.pin) {
      updateData.pinHash = await hashPassword(data.pin);
      updateData.pinEnabled = true;
    } else if (data.pinEnabled === false) {
      updateData.pinHash = null;
      updateData.pinEnabled = false;
    }

    const updated = await withUserContext(prisma, userId, async (tx) => {
      return tx.userSettings.update({
        where: { userId },
        data: updateData,
      });
    });

    return reply.send({
      message: 'Settings updated successfully',
      settings: {
        language: updated.language,
        currency: updated.currency,
        theme: updated.theme,
        reminderTime: updated.reminderTime,
        reminderEnabled: updated.reminderEnabled,
        pinEnabled: updated.pinEnabled,
      },
    });
  });
}
