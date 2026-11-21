# Dashboard Route (`dashboard`)

## Overview
Server-rendered clinic dashboard route combining schedule overview, financial analysis, and Suspense-streamed expense management inside a URL-driven tabbed interface.

## Interface
- `[page.tsx:DashboardPage]` — Default exported async page component accepting `{ searchParams: Promise<{ mes?: string; categorias?: string; status?: string; q?: string; page?: string }> }`.
- `[page.tsx:DashboardPage]` — Renders `PageTabs` (`PacienteTabs`, `defaultValue="agenda"`) hosting `AgendaResumoCard`, `AnaliseFinanceira`, and `DespesasTab` wrapped in `Suspense` with `TableSkeleton` fallback.
- Subdirectories:
  - `despesas`: [./despesas/README.md](./despesas/README.md) — Expense creation and editing routes.

## Invariants
- `[page.tsx:DashboardPage]` — Parses expense filters from `searchParams` via `parseFiltrosDespesas(params)`.
- `[page.tsx:DashboardPage]` — Clamps expense page number to at least `1` via `Math.max(1, Number(params.page) || 1)`.
- `[page.tsx:DashboardPage]` — Orders professionals by `{ name: "asc" }` and maps null names to `"Sem nome"`; maps rooms and services to `{ id: s.id, label: s.nome }`.
- `[page.tsx:DashboardPage]` — Keys `AgendaResumoCard` by ``proximos.map((a) => `${a.id}:${a.status}:${a.dataInicio.getTime()}`).join("|")``.
- `[page.tsx:DashboardPage]` — Keys the `DespesasTab` `Suspense` boundary by `filtrosDespesas.mes`.

## Side Effects
- `[page.tsx:DashboardPage]` — Calls `getProximosAgendamentos()`, `getContagensAgenda()`, `getAnaliseFinanceira()`, `listSalas()`, `listAllServicos()`, and `prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })` in parallel via `Promise.all`.

## Verification
- Run: `npm test`
