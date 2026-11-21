# Configurações Route (`configuracoes`)

## Overview
Server-rendered clinic configuration route that preloads attendance schedules, room configurations, operating days, holidays, and financial fee settings in parallel and renders them in a four-tab configuration interface.

## Interface
- `[page.tsx:ConfiguracoesPage]` — Default exported async page component (no props).
- `[page.tsx:ConfiguracoesPage]` — Renders `ConfiguracoesTabs` (`defaultValue="horarios"` with tabs `"horarios"`, `"salas"`, `"funcionamento"`, and `"financeiro"`) hosting `HorariosAtendimentoCard`, `SalasConfig`, `FuncionamentoConfig`, and `FinanceiroConfig`.

## Invariants
- None

## Side Effects
- `[page.tsx:ConfiguracoesPage]` — Calls `listHorariosAtendimentoAgrupados()`, `listSalas()`, `getConfigSalas()`, `listDiasFuncionamento()`, `listFeriados()`, and `listConfiguracoesTaxa()` in parallel via `Promise.all`.

## Verification
- Run: `npm test`
