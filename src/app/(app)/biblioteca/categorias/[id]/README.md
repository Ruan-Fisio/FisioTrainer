# Editar Categoria Route (`biblioteca/categorias/[id]`)

## Overview
Dynamic Next.js App Router page for editing an existing exercise category. Loads the category record by `id` from Prisma and renders `CategoriaForm` in edit mode bound to the `updateCategoria` server action.

## Interface
- `[page.tsx:EditarCategoriaPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- Rendered child component `CategoriaForm` (imported, not defined in `page.tsx`) (`@/components/categorias/categoria-form`) receiving `action={updateCategoria.bind(null, id)}`, `defaultValues={categoria}`, and `mode="edit"`.

## Invariants
- `[page.tsx:EditarCategoriaPage]` — Invokes `notFound()` if `prisma.categoria.findUnique` returns null/falsy (`if (!categoria) notFound()`).
- `[page.tsx:EditarCategoriaPage]` — Restricts queried fields to `{ name: true }` and binds route param `id` as the first argument to `updateCategoria` (`updateCategoria.bind(null, id)`).

## Side Effects
- `[page.tsx:EditarCategoriaPage]` — Queries Prisma via `prisma.categoria.findUnique({ where: { id }, select: { name: true } })`.

## Verification
- Run: `npm test`
