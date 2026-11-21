# Novo Treino Route (`treinos/novo`)

## Overview
Next.js App Router page for creating a new workout template. Queries all library exercises ordered alphabetically and renders `TreinoForm` in create mode wired to `createTreino`.

## Interface
- `[page.tsx:NovoTreinoPage]` — Default exported async page component (no props).
- Rendered child component `TreinoForm` (imported, not defined in `page.tsx`) receiving `action={createTreino}`, `exercicioOptions={exercicios}`, `mode="create"`, and `backHref="/treinos"`.

## Invariants
- `[page.tsx:NovoTreinoPage]` — Orders queried exercise options by `{ name: "asc" }`.

## Side Effects
- `[page.tsx:NovoTreinoPage]` — Queries Prisma via `prisma.exercicio.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, links: { select: { id: true, url: true } } } })`.

## Verification
- Run: `npm test`
