# Novo Plano Route (`planos/novo`)

## Overview
Next.js App Router page for creating a new plan. Loads all available clinic rooms and renders `PlanoForm` in create mode wired to `createPlano`.

## Interface
- `[page.tsx:NovoPlanoPage]` — Default exported async page component (no props).
- Rendered child component `PlanoForm` (imported, not defined in `page.tsx`) receiving `action={createPlano}`, `mode="create"`, and `salas={salas}`.

## Invariants
- None

## Side Effects
- `[page.tsx:NovoPlanoPage]` — Calls `listSalas()` from `@/actions/salas`.

## Verification
- Run: `npm test`
