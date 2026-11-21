# Agenda Route (`agenda`)

## Overview
Server-rendered clinic scheduling route supporting calendar (month, week, day) and paginated table list views with URL-driven filters, automatic materialization of recurring schedule grids, and a loading skeleton.

## Interface
- `[page.tsx:AgendaPage]` — Default exported async page component accepting `{ searchParams }: PageProps`.
- `[page.tsx:PageProps]` — Internal prop type defining `searchParams: Promise<{ tab?, view?, data?, page?, pacientes?, profissionais?, modalidades?, salas?, servicos?, planoHibrido?, status?, de?, ate? }>`.
- `[page.tsx:CalendarioView]` — Internal async server component rendering `CalendarioNav` and one of `CalendarioMes`, `CalendarioSemana`, or `CalendarioDia`.
- `[page.tsx:AgendaPage]` — Renders `AgendaTabs`, `MultiSelectFilter`, `ToggleFilter`, `DateRangeFilter`, `CalendarioView`, and `AgendamentosTable` wrapped in `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering animated header placeholders and `TableSkeleton`.

## Invariants
- `[page.tsx:AgendaPage]` — Defaults `tab` to `"calendario"` unless `params.tab === "lista"`.
- `[page.tsx:AgendaPage]` — Defaults `visao` to `"mes"` unless `params.view === "semana"` or `params.view === "dia"`.
- `[page.tsx:AgendaPage]` — Resolves the reference date in Brasília timezone (`TIMEZONE`): `ymdReferencia` falls back from `params.data` to `toDateInputValue(new Date())`, parsed via `combinarDataHora(ymdReferencia, "12:00")`.
- `[page.tsx:CalendarioView]` — Computes visible calendar bounds via `getIntervaloVisivel(visao, dataReferencia)` and formats the header title with `formatInTimeZone(..., TIMEZONE, ..., { locale: ptBR })`.
- `[page.tsx:AgendaPage]` — Coerces pagination via `Number(params.page ?? "1") || 1`.
- `[page.tsx:AgendaPage]` — Parses multi-value filter params (`pacientes`, `profissionais`, `modalidades`, `salas`, `servicos`, `status`) via `parseListParam`, evaluates `planoHibrido` strictly as `params.planoHibrido === "1"`, and defaults `de`/`ate` to `""` while passing `de || undefined` and `ate || undefined` to `AgendamentosTable`.
- `[page.tsx:AgendaPage]` — Filters patients with `where: PACIENTE_ATIVO` ordered by `{ nome: "asc" }` and orders professionals by `{ name: "asc" }` with null names mapped to `"Sem nome"`.
- `[page.tsx:AgendaPage]` — Keys the `Suspense` boundary wrapping `AgendamentosTable` by `page` and all active filter values so skeleton fallback triggers on filter/page transitions.

## Side Effects
- `[page.tsx:AgendaPage]` — Calls `materializarTodasGrades()` to materialize recurring schedule grids over the rolling horizon.
- `[page.tsx:AgendaPage]` — Queries Prisma via `prisma.paciente.findMany({ where: PACIENTE_ATIVO, orderBy: { nome: "asc" }, select: { id: true, nome: true } })` and `prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })` in `Promise.all`.
- `[page.tsx:AgendaPage]` — Calls `listSalas()` and `listAllServicos()` in `Promise.all`.
- `[page.tsx:CalendarioView]` — Calls `listAgendamentosPorIntervalo({ inicio, fim, profissionalIds, modalidades, salaIds, servicoIds, planoHibrido })`.

## Verification
- Run: `npm test`
