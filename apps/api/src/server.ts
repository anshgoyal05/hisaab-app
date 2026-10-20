import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { authRoutes } from './routes/auth.routes.js';
import { meRoutes } from './routes/me.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { categoryRoutes } from './routes/categories.routes.js';
import { peopleRoutes } from './routes/people.routes.js';
import { transactionRoutes } from './routes/transactions.routes.js';
import { settlementRoutes } from './routes/settlements.routes.js';
import { balanceRoutes } from './routes/balances.routes.js';
import { reportRoutes } from './routes/reports.routes.js';
import { budgetRoutes } from './routes/budgets.routes.js';
import { reminderRoutes } from './routes/reminders.routes.js';

export async function createServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      serializers: {
        // Redact authorization headers and body content in logs to prevent PII exposure
        req(req) {
          return {
            method: req.method,
            url: req.url,
            remoteAddress: req.ip,
          };
        },
      },
    },
    bodyLimit: 1048576, // 1 MB limit
  });

  // Security Headers via Helmet
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // CORS
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost and frontend origin
      cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Cookies
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'dev_cookie_secret_min32chars_hisaab_2026',
    hook: 'onRequest',
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: process.env.NODE_ENV === 'test' ? 10000 : 1000,
    timeWindow: '1 minute',
  });

  // Swagger OpenAPI Docs
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Hisaab API',
        description: 'REST API for Hisaab personal expense tracker and campus ledger',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:4000',
          description: 'Local development server',
        },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Healthcheck endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'hisaab-api',
      timestamp: new Date().toISOString(),
    };
  });

  // API v1 routes
  await app.register(
    async (v1) => {
      await v1.register(authRoutes, { prefix: '/auth' });
      await v1.register(meRoutes, { prefix: '/me' });
      await v1.register(settingsRoutes, { prefix: '/settings' });
      await v1.register(categoryRoutes, { prefix: '/categories' });
      await v1.register(peopleRoutes, { prefix: '/people' });
      await v1.register(transactionRoutes, { prefix: '/transactions' });
      await v1.register(settlementRoutes, { prefix: '/settlements' });
      await v1.register(balanceRoutes, { prefix: '/balances' });
      await v1.register(reportRoutes, { prefix: '/reports' });
      await v1.register(budgetRoutes, { prefix: '/budgets' });
      await v1.register(reminderRoutes, { prefix: '/reminders' });
    },
    { prefix: '/api/v1' }
  );

  // Global error handler
  app.setErrorHandler((error: any, _request, reply) => {
    const statusCode = error.statusCode || 500;
    const isProd = process.env.NODE_ENV === 'production';

    const response = {
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: statusCode === 500 && isProd ? 'An unexpected server error occurred.' : error.message,
      },
    };

    reply.status(statusCode).send(response);
  });

  return app;
}
