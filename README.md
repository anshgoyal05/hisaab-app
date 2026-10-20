# 📖 Hisaab — Campus Expense Tracker & Shared Ledger

> **"A campus notebook, not a banking app."**  
> Designed for Indian college students. Warm paper aesthetic, deep-teal ink, zero floats, zero tracking, and exact to the paise.

---

## 🌟 Philosophy & Core Principles

1. **Privacy First**: The user's financial data is theirs alone. Encrypted notes and names, zero trackers, zero third-party telemetry. Export everything to JSON/CSV or permanently wipe the account in one click.
2. **Correctness over Cleverness**: Money math is strictly in **integer paise** (`BigInt` / integers). Never floats. Remainder paise in splits are deterministically distributed. Balances net to zero and are verified via property-based testing.
3. **Campus Speed**: Logging a daily chai or canteen bill takes **under 10 seconds** via the high-speed numeric keypad and smart defaults.
4. **Trilingual Campus Fluency**: Seamless instant switching between **English**, **Hindi (हिन्दी)**, and **Hinglish** (Roman-script Hindi) without page reloads.

---

## ⚡ Quick Start (Under 10 Minutes)

### Option 1: Docker Compose (Single Command)

```bash
docker compose up --build
```

- **Web Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **OpenAPI Swagger Docs**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **PostgreSQL**: `localhost:5432` (`hisaab_db`)

### Option 2: Local Development with pnpm

**Prerequisites**: Node.js >= 20.0.0, pnpm >= 9.0.0, Docker (for PostgreSQL).

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL container
docker run -d --name campushub-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgrespassword \
  -e POSTGRES_DB=hisaab_db \
  -p 5432:5432 postgres:16-alpine

# 3. Run Prisma Migrations & Seed Demo Data
pnpm --filter @hisaab/api prisma:generate
pnpm --filter @hisaab/api prisma:migrate
pnpm seed

# 4. Start both API and Web servers
pnpm dev
```

---

## 🎓 Demo Account Credentials

A pre-populated campus demo account is ready out of the box with realistic dhaba splits, chai breaks, settlements, and budgets:

- **Email**: `demo@hisaab.app`
- **Password**: `CampusHisaab2026!`
- **One-Click Demo Button**: Available directly on the login screen (`Try 1-Click Demo`).

---

## 📐 Architecture & Monorepo Structure

```
/
├── apps/
│   ├── web/                    # Vite + React 18 + Tailwind CSS + PWA
│   │   ├── src/
│   │   │   ├── components/     # UI Design System (Keypad, BottomSheet, MetricCard, etc.)
│   │   │   ├── screens/        # Home, People, History, Reports, Budgets, Settings, Auth
│   │   │   ├── locales/        # en.json, hi.json, hinglish.json
│   │   │   └── lib/            # API client and IndexedDB offline mutation sync engine
│   └── api/                    # Fastify + TypeScript + Prisma + PostgreSQL
│       ├── src/
│       │   ├── crypto/         # AES-256-GCM envelope encryption & Argon2id hashing
│       │   ├── db/             # Prisma client & PostgreSQL Row-Level Security (RLS)
│       │   └── routes/         # Auth, People, Transactions, Balances, Reports, Budgets
├── packages/
│   └── shared/                 # Shared TypeScript models, Zod validation, paise math
│       ├── src/money/          # Split distribution, net balance, spending logic, formatters
│       └── src/schemas/        # Request/response validation schemas
├── tests/
│   └── e2e/                    # Playwright end-to-end tests across 390px, 768px, 1440px
├── docs/
│   ├── PLAN.md                 # Complete system specification & architecture
│   ├── SECURITY.md             # OWASP checklist, threat model & key rotation guide
│   └── DEPLOY.md               # Production deployment runbook
├── docker-compose.yml          # Containerized orchestration
└── README.md
```

---

## 🔒 Security Architecture Highlights

- **Row-Level Security (RLS)**: Enforced directly inside PostgreSQL. Every query sets `app.current_user_id` inside the transaction. If missing or unauthenticated, PostgreSQL returns 0 rows.
- **Envelope Encryption**: Friend names, contact numbers, and notes are encrypted at rest with **AES-256-GCM** using unique per-user Data Encryption Keys (DEKs) wrapped by a master Key Encryption Key (KEK).
- **Argon2id & Breach Defense**: Passwords are hashed with Argon2id and checked against an offline list of 100,000 top breached passwords.
- **Client-Side Blind Filtering**: Search operations run client-side in memory on decrypted local caches—search keywords are never sent to the server, preventing query logging leakage.
- **Zero Telemetry**: No third-party trackers, no telemetry SDKs, no Google Analytics.

---

## 🧪 Test Verification

Run all unit, property-based, API, and E2E tests:

```bash
# 1. Run all unit and property tests (fast-check paise conservation)
pnpm test

# 2. Run backend API & IDOR isolation tests
pnpm --filter @hisaab/api test

# 3. Run Playwright E2E tests across 390px, 768px, and 1440px
pnpm test:e2e
```

---

## 📱 Supported Viewports & Platforms

- **Mobile (390px)**: Bottom navigation bar, swipe gestures, numeric keypad bottom-sheet modal.
- **Tablet (768px)**: Responsive two-column metric grid and unified top navigation.
- **Desktop (1440px)**: Full sticky desktop navigation bar, wide ledger cards, detailed history table.
- **PWA**: Installable on Android and iOS home screens with offline IndexedDB outbox queue.
