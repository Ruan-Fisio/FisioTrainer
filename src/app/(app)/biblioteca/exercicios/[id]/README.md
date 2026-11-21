# Detalhe do Exercício Route (`biblioteca/exercicios/[id]`)

## Overview
Dynamic Next.js App Router detail page displaying an exercise's name, category badges, sharing control, edit navigation link (`/biblioteca/exercicios/${id}/editar`), and media link preview grid.

## Interface
- `[page.tsx:ExercicioDetailPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- `[page.tsx:ExercicioDetailPage]` — Renders `ShareButton` (`exercicioId={id}`), a link to `/biblioteca/exercicios/${id}/editar` inside `Button`, `Badge` per category, and `LinkPreviewGrid` for reference URLs.
- Subdirectories:
  - `editar`: [./editar/README.md](./editar/README.md) — Edit this exercise.

## Invariants
- `[page.tsx:ExercicioDetailPage]` — Invokes `notFound()` when `prisma.exercicio.findUnique` returns null (`if (!exercicio) notFound()`).
- `[page.tsx:ExercicioDetailPage]` — Orders included `exercicio.links` by `{ createdAt: "asc" }`.
- `[page.tsx:ExercicioDetailPage]` — Renders empty-state text instead of `LinkPreviewGrid` when `exercicio.links.length === 0`.

## Side Effects
- `[page.tsx:ExercicioDetailPage]` — Queries Prisma via `prisma.exercicio.findUnique({ where: { id }, include: { categorias: { select: { id: true, name: true } }, links: { select: { url: true }, orderBy: { createdAt: "asc" } } } })`.

## Verification
- Run: `npm test`
