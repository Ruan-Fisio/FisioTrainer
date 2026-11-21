# Contratos Route (`contratos`)

## Overview
Server-rendered contracts route providing a two-tab workspace for browsing/filtering assigned plan contracts and editing the clinic's contract template.

## Interface
- `[page.tsx:ContratosPage]` — Default exported async page component accepting `{ searchParams }: PageProps`.
- `[page.tsx:PageProps]` — Internal prop type defining `searchParams: Promise<{ tab?: string; page?: string; q?: string; status?: string }>`.
- `[page.tsx:ModeloLoader]` — Internal async server component loading the editable contract template and rendering `ModeloContratoForm`.
- `[page.tsx:ContratosPage]` — Renders `ContratosTabs`, `SearchInput`, `MultiSelectFilter` (`paramName="status"`, options derived from `STATUS_CONTRATO_LABEL`), `ContratosLista`, and `ModeloLoader` inside `Suspense` boundaries with `TableSkeleton` fallbacks.

## Invariants
- `[page.tsx:ContratosPage]` — Resolves `tab` to `"modelo"` only when `params.tab === "modelo"`; otherwise defaults to `"lista"`.
- `[page.tsx:ContratosPage]` — Coerces pagination via `Number(params.page ?? "1") || 1` and defaults `search` to `params.q ?? ""`.
- `[page.tsx:ContratosPage]` — Parses `status` via `parseListParam(params.status)` and filters values to valid `StatusContrato` keys using `Object.hasOwn(STATUS_CONTRATO_LABEL, s)`.
- `[page.tsx:ContratosPage]` — Keys the `Suspense` boundary wrapping `ContratosLista` by `${page}-${search}-${status.join()}`.

## Side Effects
- `[page.tsx:ModeloLoader]` — Calls `getModeloParaEdicao()` from `@/actions/contratos`.

## Verification
- Run: `npm test`
