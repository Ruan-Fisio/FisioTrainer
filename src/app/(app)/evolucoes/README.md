# Evoluções Route (`evolucoes`)

## Overview
Server-rendered physiotherapy evolutions listing route with active-patient, professional, and default 30-day date-range filters plus a table loading skeleton.

## Interface
- `[page.tsx:EvolucoesPage]` — Default exported async page component accepting `{ searchParams }: PageProps`.
- `[page.tsx:PageProps]` — Internal prop type defining `searchParams: Promise<{ page?: string; pacientes?: string; profissionais?: string; de?: string; ate?: string }>`.
- `[page.tsx:ultimos30DiasPadrao]` — Internal helper computing default 30-day date bounds formatted via `toDateInputValue(...)`.
- `[page.tsx:EvolucoesPage]` — Renders `MultiSelectFilter` (`paramName="pacientes"` and `paramName="profissionais"`), `DateRangeFilter`, and `EvolucoesTable` inside `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering animated placeholder divs and `TableSkeleton`.

## Invariants
- `[page.tsx:EvolucoesPage]` — Coerces pagination via `Number(params.page ?? "1") || 1` and parses `pacienteIds` and `profissionalIds` via `parseListParam(...)`.
- `[page.tsx:ultimos30DiasPadrao]` / `[page.tsx:EvolucoesPage]` — Defaults `de` and `ate` to the last 30 days formatted via `toDateInputValue(...)`, normalizing empty strings to `undefined` (`de || undefined`, `ate || undefined`) when passing props to `EvolucoesTable`.
- `[page.tsx:EvolucoesPage]` — Filters patient options by `PACIENTE_ATIVO` ordered by `{ nome: "asc" }` and orders professional options by `{ name: "asc" }`.
- `[page.tsx:EvolucoesPage]` — Keys the `Suspense` boundary wrapping `EvolucoesTable` by `${page}-${pacienteIds.join(",")}-${profissionalIds.join(",")}-${de}-${ate}`.

## Side Effects
- `[page.tsx:EvolucoesPage]` — Queries Prisma via `prisma.paciente.findMany({ where: PACIENTE_ATIVO, orderBy: { nome: "asc" }, select: { id: true, nome: true } })` and `prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })` in parallel via `Promise.all`.

## Verification
- Run: `npm test`
