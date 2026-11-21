# Novo Exercício Route (`biblioteca/exercicios/novo`)

## Overview
Next.js App Router page for creating a new library exercise. Loads all available categories and renders `ExercicioForm` in create mode wired to `createExercicio`.

## Interface
- `[page.tsx:NovoExercicioPage]` — Default exported async page component (no props).
- Rendered child component `ExercicioForm` (imported, not defined in `page.tsx`) receiving `action={createExercicio}`, `categoriaOptions={categorias}`, and `mode="create"`.

## Invariants
- None

## Side Effects
- `[page.tsx:NovoExercicioPage]` — Calls `listAllCategorias()` from `@/actions/categorias`.

## Verification
- Run: `npm test`
