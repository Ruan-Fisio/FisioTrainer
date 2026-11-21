# Exames Route (`exames`)

## Overview
Server-rendered exam templates listing route that parses pagination and search query parameters and renders `ExameFilters`, `ExamesTable` behind `Suspense` boundaries, a link to create a new exam (`/exames/novo`), and a loading skeleton.

## Interface
- `[page.tsx:ExamesPage]` — Default exported async page component accepting `searchParams: Promise<{ page?: string; q?: string }>` (`PageProps`); renders a link to `/exames/novo`, `ExameFilters`, and `ExamesTable` inside `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering header/filter placeholders and `TableSkeleton`.
- Subdirectories:
  - `[id]`: [`./[id]/README.md`](./%5Bid%5D/README.md) — View exam template details and navigate to collaborative editing.
  - `novo`: [./novo/README.md](./novo/README.md) — Create a new exam template.

## Invariants
- `[page.tsx:ExamesPage]` — Coerces pagination via `Number(params.page ?? "1") || 1` and defaults search via `params.q ?? ""`.
- `[page.tsx:ExamesPage]` — Keys the `ExamesTable` `Suspense` boundary on `${page}-${search}` with `TableSkeleton` fallback.

## Side Effects
- None

## Verification
- Run: `npm test`
