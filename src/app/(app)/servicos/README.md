# Serviços Route (`servicos`)

## Overview
Server-rendered route for listing and searching clinic services with URL-driven pagination, a link to create a new service (`/servicos/novo`), and a table loading skeleton.

## Interface
- `[page.tsx:ServicosPage]` — Default exported async page component accepting `searchParams: Promise<{ page?: string; q?: string }>` (`PageProps`); renders a link to `/servicos/novo`, `SearchInput`, and `ServicosTable` inside `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering animated header placeholders and `TableSkeleton`.
- Subdirectories:
  - `[id]`: [`./[id]/README.md`](./%5Bid%5D/README.md) — Edit an existing service.
  - `novo`: [./novo/README.md](./novo/README.md) — Create a new service.

## Invariants
- `[page.tsx:ServicosPage]` — Coerces `searchParams.page` via `Number(params.page ?? "1") || 1` and defaults `searchParams.q` via `params.q ?? ""`.
- `[page.tsx:ServicosPage]` — Keys the `Suspense` boundary with `${page}-${search}` so pagination or search changes re-trigger `TableSkeleton`.

## Side Effects
- None

## Verification
- Run: `npm test`
