# Goniometria Route (`biblioteca-movimento/goniometria`)

## Overview
Server-rendered route for managing goniometry movements with search, pagination, CSV import (`MovimentoCsvImport`), a link to create a new movement (`/biblioteca-movimento/goniometria/novo`), and a table loading skeleton.

## Interface
- `[page.tsx:GoniometriaPage]` — Default exported async page component accepting `searchParams: Promise<{ page?: string; q?: string }>` (`PageProps`); renders `MovimentoCsvImport`, a link to `/biblioteca-movimento/goniometria/novo`, `SearchInput`, and `MovimentosTable` inside `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering animated header placeholders and `TableSkeleton`.
- Subdirectories:
  - `[id]`: [`./[id]/README.md`](./%5Bid%5D/README.md) — Edit an existing goniometry movement.
  - `novo`: [./novo/README.md](./novo/README.md) — Create a new goniometry movement.

## Invariants
- `[page.tsx:GoniometriaPage]` — Coerces `searchParams.page` via `Number(params.page ?? "1") || 1` and defaults `searchParams.q` via `params.q ?? ""`.
- `[page.tsx:GoniometriaPage]` — Keys the `Suspense` boundary with `${page}-${search}` so pagination or search changes re-trigger `TableSkeleton`.

## Side Effects
- None

## Verification
- Run: `npm test`
