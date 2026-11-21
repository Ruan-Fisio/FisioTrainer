# Logs Components

## Overview
Provides UI components for viewing and inspecting system audit logs: an async server component (`LogsTable`) that fetches paginated audit log entries and renders them in responsive card and table layouts, and a client dialog (`LogDetalhesDialog`) that displays structured JSON details for a single log entry.

## Interface
- `[log-detalhes-dialog.tsx:LogDetalhesDialog]`: Client component (`"use client"`) accepting `{ resumo: string; quando: string; usuario: string; registroId: string | null; dados: unknown }`; renders a trigger button (`Detalhes`) and modal dialog displaying log metadata and pretty-printed JSON payload.
- `[logs-table.tsx:LogsTable]`: Async server component accepting `{ filters: LogFilters; page: number }`; fetches paginated logs via `listLogs(filters, page)` and renders either an empty-state card or the total count, responsive mobile cards / desktop table, per-row `LogDetalhesDialog`, and `PaginationControls`.

## Invariants
- `[log-detalhes-dialog.tsx:"use client"]`: `LogDetalhesDialog` is a Next.js Client Component.
- `[log-detalhes-dialog.tsx:LogDetalhesDialog]`: Appends ` · registro ${registroId}` to `DialogDescription` only when `registroId` is truthy, and formats `dados` via `JSON.stringify(dados ?? {}, null, 2)` (defaulting nullish values to `{}`).
- `[logs-table.tsx:LogsTable]`: When `logs.length === 0`, renders only the empty-state `Card` (`Nenhuma operação registrada com esses filtros.`) without count or `PaginationControls`.
- `[logs-table.tsx:LogsTable]`: Nullish `log.usuarioNome` falls back to `"Sistema"`; timestamps are formatted with `formatarDataHoraSegundos`, modules with `moduloLabel`, and actions with `acaoLabel`.
- `[logs-table.tsx:acaoClasse]`: Action badge color classes branch by prefix (`acao.startsWith("create")` -> green, `acao.startsWith("delete")` -> destructive, otherwise primary).
- `[logs-table.tsx:LogsTable]`: Total count text pluralizes `registro` when `total !== 1` and renders dual responsive layouts (`md:hidden` cards and `hidden md:block` table).

## Side Effects
- `[logs-table.tsx:LogsTable]`: Invokes the server action `await listLogs(filters, page)` (`@/actions/logs`) during server render.

## Verification
- Run: `npm test`
