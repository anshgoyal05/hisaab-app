# 🚀 Hisaab — Production Deployment Guide (DEPLOY.md)

This runbook details how to deploy **Hisaab** to production environments with security hardening, environment variables, database migrations, and SSL/TLS configuration.

---

## 1. Environment Variables Specification

Ensure all variables are populated in your production secret manager (e.g. AWS Secrets Manager, Doppler, or platform environment settings):

```env
# Node Environment
NODE_ENV=production
PORT=4000
API_HOST=0.0.0.0

# Database (PostgreSQL 16+)
DATABASE_URL=postgresql://user:secure_password@postgres-host:5432/hisaab_db?sslmode=require

# Cryptography & Key Management
# 32-byte hex string (64 characters) - Master Key Encryption Key
APP_MASTER_KEY=your-64-char-hex-master-encryption-key-here

# JWT Authentication
JWT_ACCESS_SECRET=your-256-bit-access-secret-minimum-64-characters
JWT_REFRESH_SECRET=your-256-bit-refresh-secret-minimum-64-characters

# Frontend URL for CORS
CORS_ORIGIN=https://hisaab.app
COOKIE_DOMAIN=.hisaab.app
```

---

## 2. Docker Production Deployment

### Building and Running Containers

```bash
# Build multi-stage optimized production images
docker compose -f docker-compose.prod.yml build

# Run containers with restart policies
docker compose -f docker-compose.prod.yml up -d
```

### Dockerfile Highlights

- **Multi-Stage Build**: Base alpine image with pnpm; compiles TypeScript in build stage and produces minimal production runner.
- **Non-Root Execution**: Runs under unprivileged `node` user (UID 1000) for container isolation.
- **Healthchecks**: Built-in HTTP healthchecks hitting `/health` on API and `/` on static Web server.

---

## 3. Platform Deployment Options

### Option A: Railway / Render / Fly.io

1. **Database**: Provision a managed PostgreSQL instance (v16+).
2. **Backend Web Service (`apps/api`)**:
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `node apps/api/dist/index.js`
   - Healthcheck Path: `/health`
3. **Database Migration Step**:
   - Release Command: `pnpm --filter @hisaab/api prisma migrate deploy`
4. **Frontend Static Site / PWA (`apps/web`)**:
   - Build Command: `pnpm install && pnpm --filter @hisaab/web build`
   - Publish Directory: `apps/web/dist`
   - Rewrite Rule: `/* -> /index.html` (SPA fallback)

### Option B: Cloudflare Pages + Fly.io

- Deploy frontend assets directly to **Cloudflare Pages** for edge CDN caching and instant global distribution.
- Deploy backend Fastify API to **Fly.io** or **Render** close to the database region (e.g. `bom` Mumbai or `del` Delhi for lowest latency in India).

---

## 4. Database Security & Migration Runbook

Before opening traffic to new versions:

```bash
# 1. Apply schema migrations
prisma migrate deploy

# 2. Verify Row-Level Security policies are active
psql $DATABASE_URL -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
"
# Ensure 'rowsecurity' is 'true' for transactions, people, settlements, budgets.
```

---

## 5. Security & TLS Checklist

- [x] **Strict Transport Security (HSTS)** enabled with `max-age=31536000; includeSubDomains; preload`.
- [x] **Content Security Policy (CSP)** configured via `@fastify/helmet`.
- [x] **httpOnly SameSite=Strict** cookies for rotating refresh tokens.
- [x] **No sensitive data in logs**: All names, notes, and passwords are encrypted or hashed.
- [x] **Envelope Encryption Master Key**: Backed up securely in an external HSM/KMS.
