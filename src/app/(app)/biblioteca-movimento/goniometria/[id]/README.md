# Editar Movimento Route (`biblioteca-movimento/goniometria/[id]`)

## Overview
Dynamic Next.js App Router page for editing an existing goniometry movement definition. Loads the movement record by `id` from Prisma and renders `MovimentoForm` in edit mode bound to the `updateMovimento` server action.

## Interface
- `[page.tsx:EditarMovimentoPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- Rendered child component `MovimentoForm` (imported, not defined in `page.tsx`) (`@/components/movimentos/movimento-form`) receiving `action={updateMovimento.bind(null, id)}`, `defaultValues={movimento}`, and `mode="edit"`.

## Invariants
- `[page.tsx:EditarMovimentoPage]` — Invokes `notFound()` if `prisma.movimento.findUnique` returns null/falsy (`if (!movimento) notFound()`).
- `[page.tsx:EditarMovimentoPage]` — Restricts queried fields to `{ nome: true, grauIdeal: true }` and binds route param `id` to `updateMovimento` (`updateMovimento.bind(null, id)`).

## Side Effects
- `[page.tsx:EditarMovimentoPage]` — Queries Prisma via `prisma.movimento.findUnique({ where: { id }, select: { nome: true, grauIdeal: true } })`.

## Verification
- Run: `npm test`
