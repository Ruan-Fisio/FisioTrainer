# Editar Treino Route (`treinos/[id]/editar`)

## Overview
Dynamic Next.js App Router page for editing an existing workout template. Loads the workout by `id` alongside all library exercises in parallel, normalizes workout day/exercise defaults, and renders `TreinoForm` in edit mode bound to `updateTreino`.

## Interface
- `[page.tsx:EditarTreinoPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- Rendered child component `TreinoForm` (imported, not defined in `page.tsx`) receiving `mode="edit"`, `action={updateTreino.bind(null, id)}`, `exercicioOptions={exercicios}`, ``backHref={`/treinos/${id}`}``, and serialized `defaultValues`.

## Invariants
- `[page.tsx:EditarTreinoPage]` — Invokes `notFound()` when `getTreino(id)` returns null/falsy.
- `[page.tsx:EditarTreinoPage]` — Orders exercise options by `{ name: "asc" }`.
- `[page.tsx:EditarTreinoPage]` — Normalizes `defaultValues`: coalesces `descricao` to `treino.descricao ?? ""`, maps `dias` and nested `exercicios`, and converts `exercicio.carga` via `exercicio.carga ? Number(exercicio.carga) : null`.
- `[page.tsx:EditarTreinoPage]` — Binds route `id` as the first argument to `updateTreino` (`updateTreino.bind(null, id)`).

## Side Effects
- `[page.tsx:EditarTreinoPage]` — Calls `getTreino(id)` from `@/actions/treinos` inside `Promise.all`.
- `[page.tsx:EditarTreinoPage]` — Queries Prisma via `prisma.exercicio.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, links: { select: { id: true, url: true } } } })` inside `Promise.all`.

## Verification
- Run: `npm test`
