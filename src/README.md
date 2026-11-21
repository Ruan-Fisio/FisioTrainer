# Application Source (`src`)

## Overview

Primary TypeScript/React application source tree for FisioTrainer. Houses the Next.js 16 route protection proxy (`proxy.ts`) and six core packages: Next.js App Router routes (`app`), Server Actions RPC layer (`actions`), UI components (`components`), shared domain/infrastructure libraries (`lib`), reusable React hooks (`hooks`), and ambient TypeScript module augmentations (`types`). (Static PDF form templates live in `src/assets/documentos/` and generated Prisma Client output is emitted to `src/generated/prisma/`, which is gitignored.)

## Interface

### Direct Symbols
- `[proxy.ts:default]`: Default-exported NextAuth v5 edge/request proxy (`NextAuth(authConfig).auth((req) => ...)`) that enforces authentication and redirect rules on matched routes.
- `[proxy.ts:config]`: Exported route matcher configuration (`matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"]`).

### Subdirectories
- [actions](./actions/README.md) — 33 `'use server'` Next.js Server Action modules covering clinic CRUD/workflows, dual staff/portal actions, token-gated patient portal wrappers, public pre-registration/contract signing, and credential login.
- [app](./app/README.md) — Next.js App Router root layout, `/` redirect, authenticated clinic routes (`(app)`), login (`(auth)`), public pre-registration (`pre-cadastro`), shared/token-scoped portals (`compartilhado`), and HTTP API handlers (`api`).
- [components](./components/README.md) — `CollapsibleSection` and 28 domain and design-system UI component packages.
- [hooks](./hooks/README.md) — Custom React hooks (`useDebouncedCallback`).
- [lib](./lib/README.md) — Core domain logic, Prisma/R2/NextAuth infrastructure, rate limiting, audit logging, exam formula/reference-table/3-way-merge engines, AcroForm document fillers, scheduling/capacity rules, financial analytics, PDF documents (`./lib/pdf/README.md`), and Zod validation schemas (`./lib/validations/README.md`).
- [types](./types/README.md) — Ambient NextAuth `Session.user.id` and `JWT.id` module augmentations (`next-auth.d.ts`).

## Invariants

- `[proxy.ts:default]`: Allows paths starting with `"/compartilhado"` or `"/pre-cadastro"` through unconditionally via `NextResponse.next()`.
- `[proxy.ts:default]`: Redirects unauthenticated requests (`!req.auth`) for any non-public, non-`/login` matched path to `"/login"`, and redirects authenticated requests (`!!req.auth`) on `"/login"` to `"/dashboard"`.
- `[proxy.ts:config]`: Excludes `/api/*`, `_next/static`, `_next/image`, `favicon.ico`, and static image extensions (`png`, `jpg`, `jpeg`, `svg`, `gif`, `webp`, `ico`) from proxy interception; `/api/*` routes enforce their own authentication via `auth()` or portal tokens.

## Side Effects

- `[proxy.ts:default]`: Evaluates `NextAuth(authConfig)` JWT/session state on every matched HTTP request and emits HTTP redirect responses (`NextResponse.redirect`) when authentication state mismatches the target route.
- Child packages execute PostgreSQL reads/writes via Prisma, Cloudflare R2 object operations, PDF generation, audit logging, and Next.js cache revalidation; see linked child contracts.

## Verification

- Run: `npm test`
