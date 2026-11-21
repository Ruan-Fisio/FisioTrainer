# Treinos Route (`treinos`)

## Overview
Server-rendered workout templates listing route that parses pagination and search query parameters and renders `TreinoFilters`, `TreinosTable` behind `Suspense` boundaries, a link to create a new workout (`/treinos/novo`), and a loading skeleton.

## Interface
- `[page.tsx:TreinosPage]` — Default exported async page component accepting `searchParams: Promise<{ page?: string; q?: string }>` (`PageProps`); renders a link to `/treinos/novo`, `TreinoFilters`, and `TreinosTable` inside `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering header/filter placeholders and `TableSkeleton`.
- Subdirectories:
  - `[id]`: [`./[id]/README.md`](./%5Bid%5D/README.md) — View workout template details and navigate to editing.
  - `novo`: [./novo/README.md](./novo/README.md) — Create a new workout template.

## Invariants
- `[page.tsx:TreinosPage]` — Coerces pagination via `Number(params.page ?? "1") || 1` and defaults search via `params.q ?? ""`.
- `[page.tsx:TreinosPage]` — Keys the `TreinosTable` `Suspense` boundary on `${page}-${search}` with `TableSkeleton` fallback.

## Side Effects
- None

## Verification
- Run: `npm test`
