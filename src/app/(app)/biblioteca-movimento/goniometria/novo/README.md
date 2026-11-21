# Novo Movimento Route (`biblioteca-movimento/goniometria/novo`)

## Overview
Next.js App Router page for creating a new goniometry movement definition. Renders `MovimentoForm` in create mode wired to the `createMovimento` server action.

## Interface
- `[page.tsx:NovoMovimentoPage]` — Default exported page component (no props).
- Rendered child component `MovimentoForm` (imported, not defined in `page.tsx`) (`@/components/movimentos/movimento-form`) receiving `action={createMovimento}` and `mode="create"`.

## Invariants
- None

## Side Effects
- None

## Verification
- Run: `npm test`
