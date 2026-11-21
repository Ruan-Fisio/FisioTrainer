# Logs Route (`logs`)

## Overview
Server-rendered system audit trail route supporting text search, module and action multi-select filtering, date-range filtering, paginated log streaming via `LogsTable`, and a route loading skeleton.

## Interface
- `[page.tsx:LogsPage]` — Default exported async page component accepting `{ searchParams }: PageProps`.
- `[page.tsx:PageProps]` — Internal prop type defining `searchParams: Promise<{ q?: string; page?: string; modulos?: string; acoes?: string; de?: string; ate?: string }>`.
- `[page.tsx:LogsPage]` — Renders `SearchInput`, `MultiSelectFilter` (`paramName="modulos"` from `MODULO_LABEL` and `paramName="acoes"` from `ACAO_LABEL`), `DateRangeFilter`, and `LogsTable` inside `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering animated placeholder divs and `TableSkeleton`.

## Invariants
- `[page.tsx:LogsPage]` — Coerces pagination via `Number(params.page ?? "1") || 1` and parses `modulos` and `acoes` via `parseListParam(...)`.
- `[page.tsx:LogsPage]` — Defaults `q`, `de`, and `ate` to `""` for filter inputs and normalizes empty strings to `undefined` (`q || undefined`, `de || undefined`, `ate || undefined`) in the `filters` prop passed to `LogsTable`.
- `[page.tsx:LogsPage]` — Keys the `Suspense` boundary wrapping `LogsTable` by `${q}-${page}-${modulos.join(",")}-${acoes.join(",")}-${de}-${ate}`.

## Side Effects
- None

## Verification
- Run: `npm test`
