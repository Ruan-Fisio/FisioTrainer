# Authenticated App Shell (`src/app/(app)`)

## Overview

Next.js App Router route group `(app)` providing the shared authenticated clinic workspace shell (`AppLayout`) with desktop sidebar, sticky header, mobile navigation sheet, and user menu, wrapping all 16 internal clinical, operational, and financial route segments.

## Interface

### Direct Symbols
- `[layout.tsx:AppLayout]`: Default-exported async Server Component accepting `{ children: React.ReactNode }`. Reads the current NextAuth session via `auth()` (`@/lib/auth`) and renders `<Sidebar />`, `<MobileNav />`, `<UserMenu name={user?.name ?? "Usuário"} email={user?.email ?? ""} />`, and `<main>{children}</main>`.

### Subdirectories
- [agenda](./agenda/README.md) — Clinic schedule route supporting month/week/day calendar and paginated table views with URL filters and recurring grid materialization.
- [biblioteca](./biblioteca/README.md) — Intermediate blueprint grouping exercise categories (`./biblioteca/categorias/README.md`) and exercise library (`./biblioteca/exercicios/README.md`).
- [biblioteca-movimento](./biblioteca-movimento/README.md) — Intermediate blueprint grouping goniometry movement management (`./biblioteca-movimento/goniometria/README.md`).
- [cobrancas](./cobrancas/README.md) — Global pending billing charges view with Pix CPF/CNPJ lookup.
- [configuracoes](./configuracoes/README.md) — Four-tab clinic configuration page (attendance slots, rooms, operating days/holidays, financial fees).
- [contratos](./contratos/README.md) — Assigned contracts list and contract template editor tabs.
- [curadoria](./curadoria/README.md) — Pre-registration curation queue with status counters (`PENDENTE`, `REJEITADO`, `APROVADO`).
- [dashboard](./dashboard/README.md) — Clinic dashboard combining upcoming appointments, financial analytics, and expenses tab (`./dashboard/despesas/README.md`).
- [evolucoes](./evolucoes/README.md) — Clinical evolutions listing with patient, professional, and 30-day default date-range filters.
- [exames](./exames/README.md) — Exam template catalog, detail view, creation, and collaborative real-time editing routes.
- [logs](./logs/README.md) — Filterable audit log listing route.
- [pacientes](./pacientes/README.md) — Patient directory (active/deleted), creation (with pre-registration prefill), and active-patient detail hub spanning charges, documents, profile editing, evolutions, exam executions/comparisons, plan assignments, and workouts.
- [planos](./planos/README.md) — Plan catalog and renewals tabs, plus plan creation and editing routes.
- [servicos](./servicos/README.md) — Custom clinic services catalog, creation, and editing routes.
- [treinos](./treinos/README.md) — Workout templates catalog, detail view, creation, and editing routes.
- [usuarios](./usuarios/README.md) — Staff users catalog, creation, and editing routes.

## Invariants

- `[layout.tsx:AppLayout]`: Coalesces missing session user properties to `name = "Usuário"` and `email = ""` when rendering `<UserMenu />`; relies on upstream route middleware (`src/proxy.ts`) and per-action/page session guards rather than redirecting directly inside `AppLayout`.
- Child routes enforce `notFound()` on missing or cross-patient resources, `PACIENTE_ATIVO` filtering for active patient layouts/lists, and numeric page coercion (`Number(page ?? "1") || 1`); see linked route contracts.

## Side Effects

- `[layout.tsx:AppLayout]`: Calls `await auth()` (`@/lib/auth`) on every render to populate the user menu and mounts `<Sidebar />`, `<MobileNav />`, and `<UserMenu />`.
- Child routes read Prisma/Server Actions on the server, materialize recurring schedules on `/agenda` (`materializarTodasGrades`) and `/pacientes/[id]` (`materializarGradesPaciente`), and bind mutation Server Actions to forms; see linked child contracts.

## Verification

- Run: `npm test`
