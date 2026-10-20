# Hisaab — Security, Cryptography & Threat Architecture (SECURITY.md)

This document provides a comprehensive security specification, threat model, and cryptographic design for **Hisaab**.

---

## 1. Encrypted Fields & Search Architecture Tradeoff

In Hisaab, personal privacy is our paramount design principle. Notes (`note_enc`), friend names (`name_enc`), and contact numbers (`phone_enc`) are encrypted at rest using **AES-256-GCM** with per-user Data Encryption Keys (DEKs).

### The Search Tradeoff: Client-Side Decrypted Filtering vs. Blind Indexing

| Metric | Option A: In-Memory / Client-Side Filtering (Selected Default) | Option B: Blind Indexing (HMAC-SHA256 Tokenization) |
|---|---|---|
| **Privacy / Leakage** | **Zero leakage**. Server and database learn nothing about search keywords, frequency, or equality. | **Leaking equality & frequency**. Identical tokens produce identical hashes; vulnerable to frequency analysis attacks on small domains. |
| **Search Capabilities** | **Full substring, substring in Hindi/Hinglish, diacritic-insensitive, regex, fuzzy matching**. | Exact word/token matching or prefix-only n-grams. Complex to handle multilingual Devanagari inflections. |
| **Performance Profile** | **Instantaneous** for campus student scale (100–500 friends, 1k–5k expenses/year takes < 5ms in memory). | Requires database index lookups and secondary hash joins. |
| **Complexity & Risk** | Very low complexity, zero cryptographic traps. | High complexity (pepper management, salt collisions, index bloating). |

### Decision
For Hisaab's campus edition, **Option A (In-Memory Scoped Filtering)** is implemented:
1. When a user requests their friends or active history, the server decrypts the user-scoped rows into memory inside the authenticated request context.
2. Search queries on the client filter against the local TanStack Query cache in memory.
3. Plaintext search terms are **never transmitted to the backend**, eliminating any exposure in HTTP logs, reverse proxy caches, or database query plans.
4. If historical queries ever require backend pagination across >10,000 transactions, a salted blind index with HMAC-SHA256 can be layered as an auxiliary index without breaking the core envelope encryption.

---

## 2. Row-Level Security (RLS) & Multi-Tenant Defense-in-Depth

Every table containing user data (`transactions`, `people`, `settlements`, `budgets`, `audit_log`) has PostgreSQL Row-Level Security enabled:

```sql
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_isolation_policy" ON "transactions"
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
```

### Execution Protocol
1. Every API request that accesses user data executes inside an interactive transaction managed by `withUserContext(prisma, userId, callback)`.
2. The transaction executes:
   ```sql
   SET LOCAL app.current_user_id = '<authenticated-user-uuid>';
   ```
3. `SET LOCAL` guarantees that the variable applies **only** to the current transaction and is cleared immediately when the transaction commits or rolls back.
4. **Behavior When User ID is Missing**:
   If an unauthenticated request or broken query executes without setting `app.current_user_id`:
   - `current_setting('app.current_user_id', true)` evaluates to `''` (or NULL).
   - `NULLIF('', '')` evaluates to `NULL`.
   - `user_id = NULL` evaluates to `FALSE` (SQL three-valued logic).
   - **PostgreSQL returns exactly ZERO rows**. Data leakage is mathematically impossible at the engine layer.

---

## 3. Master Key Handling & Rotation Procedure

### Master Key (KEK) Management
- **Development**: Stored as a 64-character hex string (32 bytes) in `.env` (`APP_MASTER_KEY`).
- **Production**: Stored in a dedicated Key Management Service:
  - AWS KMS / GCP Secret Manager / HashiCorp Vault.
  - Injected into the container environment at runtime; never checked into git or hardcoded.

### Key Rotation Procedure
Hisaab uses **Envelope Encryption**:
1. User data is encrypted with a unique per-user **Data Encryption Key (DEK)**.
2. The DEK is encrypted (wrapped) with the server's **Master Key (KEK)**: `users.dek_encrypted`.
3. To rotate the Master Key from $K_1$ to $K_2$:
   - Individual expense rows and notes **do NOT need to be re-encrypted**.
   - Only the wrapped DEKs in the `users` table are unwrapped with $K_1$ and re-wrapped with $K_2$:
   ```typescript
   rotateMasterKeyOnDek(user.dekEncrypted, oldMasterKey, newMasterKey);
   ```
   - A zero-downtime rotation script processes `users` in batches of 500. During the transition, if `APP_MASTER_KEY_PREVIOUS` is provided in the environment, the API automatically falls back to unwrap with the previous key and lazily re-wraps with the new key.

---

## 4. Offline Outbox Security & Lifecycle

To support the offline-first experience without compromising privacy:
1. **Minimal Payload**: The offline outbox stored in IndexedDB contains only the active pending mutation payload (e.g. `{ clientId, type, totalMinor, splits, noteEncrypted }`).
2. **Encrypted at Rest on Client**: The note and friend details are encrypted client-side using the session key or web crypto API before being written to IndexedDB.
3. **Session Clearing on Logout**:
   - Calling `/api/v1/auth/logout` or logging out in the client immediately executes:
   ```typescript
   await idb.deleteDatabase('hisaab_offline_outbox');
   queryClient.clear();
   ```
   - No financial data or pending records remain in the browser storage after logout.

---

## 5. OWASP Top 10 Checklist & Mitigations

| Vulnerability | Mitigation in Hisaab |
|---|---|
| **A01: Broken Access Control** | Scoped `WHERE user_id = :userId` queries + PostgreSQL Row-Level Security (RLS) enforcement. |
| **A02: Cryptographic Failures** | AES-256-GCM envelope encryption with 96-bit random IV and 128-bit auth tags. No ECB or CBC mode. |
| **A03: Injection** | 100% parameterized SQL via Prisma. Strict Zod input validation schemas. |
| **A04: Insecure Design** | Integer paise money math (zero float bugs), append-only versioned ledger, zero-sum netting invariant. |
| **A05: Security Misconfiguration** | Helmet headers (HSTS, CSP, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin). |
| **A06: Vulnerable Components** | Pinned npm versions, automated `pnpm audit` in GitHub Actions CI. |
| **A07: Identification Failures** | Argon2id password hashing, offline 100k breached password checks, rotating refresh tokens with reuse family revocation. |
| **A08: Software Integrity Failures**| Client UUID idempotency keys prevent double submissions on network retries. |
| **A09: Logging Failures** | Structured JSON logger strictly redacting passwords, notes, friend names, tokens, and financial amounts. |
| **A10: SSRF** | Zero external outbound HTTP requests. Fonts and assets are 100% self-hosted. |
