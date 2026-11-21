# FisioTrainer Blueprint

## System Overview

FisioTrainer is a Next.js 16 (App Router) + React 19 + TypeScript clinical management platform for physiotherapy and physical education clinics, backed by PostgreSQL (Prisma 7 via `@prisma/adapter-pg`), NextAuth v5 credentials authentication, Cloudflare R2 object storage (`@aws-sdk/client-s3`), and server-side PDF generation (`@react-pdf/renderer` and `pdf-lib` AcroForm templates).

The system spans patient lifecycle and pre-registration curation, versioned clinical exams with a custom formula/reference-table engine and collaborative autosave, clinical evolutions, workout templates and patient assignments, room/modality/recurring-grid appointment scheduling, catalog plans, electronic contract signing, billing/expenses analytics, clinical PDF documents, and token-scoped patient portal access.

### Getting Started

Bootstrapped with Next.js (`create-next-app`), using `next/font` (`Geist` and `Geist_Mono`):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser (`dev` runs `prisma generate && prisma migrate deploy && next dev`).

## Local Interface & Invariants

- `[next.config.ts:nextConfig]` & `[next.config.ts:process.env.TZ]`:
  - **Invariant**: Unconditionally forces `process.env.TZ = process.env.APP_TIMEZONE ?? "America/Sao_Paulo"` at config load so server-side date calculations match the clinic's Brasília timezone regardless of host UTC defaults.
  - **Invariant**: Sets `agentRules: false`, bundles `./src/assets/documentos/**` via `outputFileTracingIncludes` for `/api/documentos/[id]/pdf` and `/compartilhado/paciente/[token]/documentos/[id]/pdf`, and isolates `distDir` when `process.env.NEXT_DIST_DIR` is set (used by Playwright E2E).
  - **Side Effect**: Mutates `process.env.TZ` on module evaluation.
- `[prisma.config.ts:default]`:
  - **Interface**: `defineConfig` pointing Prisma CLI to `prisma/schema.prisma` and `prisma/migrations`.
  - **Invariant**: Resolves datasource `url` via `process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]` so `prisma migrate deploy` uses a direct (non-pooled) PostgreSQL connection for advisory locks.
  - **Side Effect**: Imports `"dotenv/config"`, mutating `process.env` from `.env`.
- `[vitest.config.mts:default]`:
  - **Interface**: Vitest config mapping `@` to `./src` (`resolve.alias`) and excluding `["node_modules/**", "e2e/**"]` so `npm test` runs only unit tests under `src/**` (never Playwright specs).
- `[playwright.config.ts:default]`:
  - **Interface**: Playwright E2E config targeting `./e2e/tests` (`globalSetup: "./e2e/global-setup.ts"`, `workers: 2`, `timeout: 30_000`, `setup` + `chromium` projects).
  - **Invariant**: Launches an isolated `next dev -p 3100` against `TEST_DATABASE_URL` (`./e2e/test-db`) with `NEXT_DIST_DIR=".next-e2e"`, `NEXT_PUBLIC_APP_URL="http://localhost:3100"`, and `CONTRATOS_STORAGE_DIR="test-results/contratos"` so E2E runs never collide with dev builds, dev databases, or production R2 contract storage.
- `[eslint.config.mjs:eslintConfig]`:
  - **Invariant**: Combines `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, and custom `regrasDataFuso` (`no-restricted-syntax` errors banning raw `.toLocaleString`/`.toLocaleDateString`/`.toLocaleTimeString` and `new Intl.DateTimeFormat` across `src/**/*.{ts,tsx}`, exempting `src/lib/format.ts`, `src/components/ui/**`, and `*.test.{ts,tsx}`).
- `[postcss.config.mjs:config]`: Configures the `@tailwindcss/postcss` plugin.
- `[package.json:scripts]`: Defines `postinstall` (`prisma generate`), `dev`, `build`, `start`, `lint` (`eslint`), `test` (`vitest run`), `test:e2e` (`playwright test`), `test:e2e:ui`, and `db:seed` (`tsx prisma/seed.ts`).

## Subdirectories & System Boundaries

- **prisma**: [./prisma/README.md](./prisma/README.md) — PostgreSQL Prisma schema (`schema.prisma`: 19 enums, 43 models, generated client output to `../src/generated/prisma`) and idempotent seed script (`seed.ts`). Historical SQL migrations live in `prisma/migrations/`.
- **scripts**: [./scripts/README.md](./scripts/README.md) — Standalone Cloudflare R2 provisioning CLI (`r2-setup.ts`) configuring bucket creation, CORS rules, and 1-day `tmp/` lifecycle expiration.
- **src**: [./src/README.md](./src/README.md) — Core application source tree: NextAuth route protection proxy (`proxy.ts`), App Router routes ([./src/app/README.md](./src/app/README.md)), 33 Server Action modules ([./src/actions/README.md](./src/actions/README.md)), 28 UI component packages ([./src/components/README.md](./src/components/README.md)), domain/infrastructure libraries ([./src/lib/README.md](./src/lib/README.md)), custom React hooks ([./src/hooks/README.md](./src/hooks/README.md)), and NextAuth type augmentations ([./src/types/README.md](./src/types/README.md)).

*(Non-code directories such as `assets/`, `docs/`, `public/`, and test-only directory `e2e/` are excluded from package contracts.)*

## Global Invariants

- **Timezone Discipline**: Runtime `TZ` is pinned to `America/Sao_Paulo` (`[next.config.ts:process.env.TZ]`), timestamp formatting and calendar boundaries run in `America/Sao_Paulo` while date-only fields format strictly in `UTC` (`[src/lib/format.ts:TIMEZONE]`, `[src/lib/datas-brasilia.ts:inicioDoDia]`), and ESLint blocks raw `Date.prototype.toLocale*` / `Intl.DateTimeFormat` calls across `src/` (`[eslint.config.mjs:regrasDataFuso]`).
- **Authentication & Portal Isolation**: Edge/request proxy (`[src/proxy.ts:default]`) protects non-public app routes while allowing `/compartilhado/*` and `/pre-cadastro/*`; Server Actions enforce `exigirSessao()` (with no role/admin differentiation across authenticated clinic users) or `exigirSessaoOuPortal(pacienteId)` via `AsyncLocalStorage` (`[src/lib/sessao.ts:comAcessoPortal]`); public patient portal and contract signing routes derive patient scope strictly server-side from opaque tokens and CPF/rate-limit checks.
- **Soft-Delete & Referential Integrity**: Deleted patients are marked with `Paciente.excluidoEm` and filtered via `PACIENTE_ATIVO` (`[src/lib/paciente-exclusao.ts:PACIENTE_ATIVO]`); in-use categories, exams, plans, rooms, and services reject deletion.
- **Scheduling & Capacity Exclusivity**: Non-cancelled appointments enforce half-open `[dataInicio, dataFim)` professional conflict checks, clinic operating-day/holiday validation, single-modality/service room exclusivity, and monthly/total plan session and rescheduling-credit budgets.
- **Safe Exam Evaluation & Concurrency**: Exam formulas and reference tables execute through a recursive-descent evaluator with 3-state DFS cycle detection (no `eval`), optimistic concurrency (`exameAlteradoDesde`), three-way merge (`mesclarExame`), and immutable versioning when an exam template already has executions.
- **Media & Contract Integrity**: Uploads enforce MIME/extension/15 MB bounds (`[src/lib/storage-keys.ts:validarArquivo]`), bucket prefix isolation, and `headObject` size verification before DB commitment; signed contracts are superseded only when the sorted `plano.*` variable hash changes (`[src/lib/contrato-regras.ts:hashDadosPlano]`).

## Global Side Effects

- **PostgreSQL (via Prisma 7 / `@prisma/adapter-pg`)**: Persistent storage for all 43 domain models, transactional mutations across scheduling/billing/plans/contracts/exams, automatic best-effort `AuditLog` writes on `AUDIT_WRITE_OPS` (unless `AUDIT_LOG === "off"`), and DB-backed rate limiting (`LimiteTentativa`).
- **Cloudflare R2 (via `@aws-sdk/client-s3`)**: Presigned `PUT`/`GET` URLs and object lifecycle operations for pre-registration files, patient attachments, exam execution images, and signed contract PDFs (falling back to local disk only outside production when `CONTRATOS_STORAGE_DIR` is set).
- **Local Filesystem Reads**: PDF renderers synchronously read `public/logo.png`, `public/fonts/GreatVibes-Regular.ttf`, and AcroForm templates under `src/assets/documentos/`.
- **Next.js Cache & Auth**: Server Actions invalidate App Router caches via `revalidatePath(...)`; NextAuth manages session cookies and `/login` ↔ `/dashboard` redirects.

## System Verification

- Run: `npm test` (unit tests via `vitest run` across `src/**`)
- Optional E2E suite (requires isolated test DB): `npm run test:e2e` (`playwright test`)
- Optional lint check: `npm run lint` (`eslint`)
