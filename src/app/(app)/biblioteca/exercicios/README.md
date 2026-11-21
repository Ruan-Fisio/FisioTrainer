# Exercícios Route (`biblioteca/exercicios`)

## Overview
Server-rendered exercise library listing route that parses pagination, search, and category multi-select filter parameters and renders `ExercicioFilters`, `ExerciciosTable` behind `Suspense` boundaries, a link to create a new exercise (`/biblioteca/exercicios/novo`), and a loading skeleton.

## Interface
- `[page.tsx:ExerciciosPage]` — Default exported async page component accepting `searchParams: Promise<{ page?: string; q?: string; categorias?: string }>` (`PageProps`); renders a link to `/biblioteca/exercicios/novo`, `ExercicioFilters`, and `ExerciciosTable` inside `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering header/filter placeholders and `TableSkeleton`.
- Subdirectories:
  - `[id]`: [`./[id]/README.md`](./%5Bid%5D/README.md) — View exercise details and navigate to editing.
  - `novo`: [./novo/README.md](./novo/README.md) — Create a new exercise.

## Invariants
- `[page.tsx:ExerciciosPage]` — Coerces pagination via `Number(params.page ?? "1") || 1`, defaults search via `params.q ?? ""`, and parses `params.categorias` into `categoriaIds` using `parseListParam(params.categorias)`.
- `[page.tsx:ExerciciosPage]` — Keys the `ExerciciosTable` `Suspense` boundary on `${page}-${search}-${categoriaIds.join(",")}` with `TableSkeleton` fallback.

## Side Effects
- None

## Verification
- Run: `npm test`
