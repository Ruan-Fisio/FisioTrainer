# Nova Categoria Route (`biblioteca/categorias/novo`)

## Overview
Next.js App Router page for creating a new exercise category. Renders `CategoriaForm` in create mode wired to the `createCategoria` server action.

## Interface
- `[page.tsx:NovaCategoriaPage]` — Default exported page component (no props).
- Rendered child component `CategoriaForm` (imported, not defined in `page.tsx`) (`@/components/categorias/categoria-form`) receiving `action={createCategoria}` and `mode="create"`.

## Invariants
- None

## Side Effects
- None

## Verification
- Run: `npm test`
