import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { prisma } from '../db/client.js';

export async function categoryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  // GET /api/v1/categories - List default and custom categories
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;

    const categories = await prisma.category.findMany({
      where: {
        OR: [{ isDefault: true }, { userId }],
      },
      orderBy: { name: 'asc' },
    });

    return reply.send({ categories });
  });

  // POST /api/v1/categories - Create custom category
  fastify.post('/', async (request, reply) => {
    const userId = request.user!.id;
    const { name, icon = 'Tag', color = '#145C53' } = request.body as any;

    if (!name || typeof name !== 'string') {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Category name is required' },
      });
    }

    const category = await prisma.category.create({
      data: {
        userId,
        name: name.trim(),
        icon,
        color,
        isDefault: false,
      },
    });

    return reply.status(201).send({ category });
  });
}
