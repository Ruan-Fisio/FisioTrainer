# Categorias Route (`biblioteca/categorias`)

## Overview
Server-rendered route for listing and searching exercise library categories with URL-driven pagination, a link to create a new category (`/biblioteca/categorias/novo`), and a table loading skeleton.

## Interface
- `[page.tsx:CategoriasPage]` — Default exported async page component accepting `searchParams: Promise<{ page?: string; q?: string }>` (`PageProps`); renders a link to `/biblioteca/categorias/novo`, `SearchInput`, and `CategoriasTable` inside `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering animated header placeholders and `TableSkeleton`.
- Subdirectories:
  - `[id]`: [`./[id]/README.md`](./%5Bid%5D/README.md) — Edit an existing category.
  - `novo`: [./novo/README.md](./novo/README.md) — Create a new category.

## Invariants
- `[page.tsx:CategoriasPage]` — Coerces `searchParams.page` via `Number(params.page ?? "1") || 1` and defaults `searchParams.q` via `params.q ?? ""`.
- `[page.tsx:CategoriasPage]` — Keys the `Suspense` boundary with `${page}-${search}` so pagination or search changes re-trigger `TableSkeleton`.

## Side Effects
- None

## Verification
- Run: `npm test`
