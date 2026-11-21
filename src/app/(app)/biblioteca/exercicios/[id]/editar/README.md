# Editar Exercício Route (`biblioteca/exercicios/[id]/editar`)

## Overview
Dynamic Next.js App Router page for editing an existing library exercise. Loads the exercise (with categories and ordered reference links) and all available categories in parallel, then renders `ExercicioForm` in edit mode bound to `updateExercicio`.

## Interface
- `[page.tsx:EditarExercicioPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- Rendered child component `ExercicioForm` (imported, not defined in `page.tsx`) (`@/components/exercicios/exercicio-form`) receiving `mode="edit"`, `action={updateExercicio.bind(null, id)}`, `categoriaOptions={categorias}`, and `defaultValues` (`name`, `categoriaIds`, `links`).

## Invariants
- `[page.tsx:EditarExercicioPage]` — Invokes `notFound()` when `prisma.exercicio.findUnique` returns null/falsy for `params.id`.
- `[page.tsx:EditarExercicioPage]` — Orders included `links` by `{ createdAt: "asc" }`.
- `[page.tsx:EditarExercicioPage]` — Transforms queried relations into `defaultValues: { name: exercicio.name, categoriaIds: exercicio.categorias.map((c) => c.id), links: exercicio.links.map((l) => l.url) }`.
- `[page.tsx:EditarExercicioPage]` — Binds route `id` as the first argument to `updateExercicio` (`updateExercicio.bind(null, id)`).

## Side Effects
- `[page.tsx:EditarExercicioPage]` — Queries Prisma via `prisma.exercicio.findUnique({ where: { id }, include: { categorias: { select: { id: true } }, links: { select: { url: true }, orderBy: { createdAt: "asc" } } } })` inside `Promise.all`.
- `[page.tsx:EditarExercicioPage]` — Calls `listAllCategorias()` from `@/actions/categorias` inside `Promise.all`.

## Verification
- Run: `npm test`
