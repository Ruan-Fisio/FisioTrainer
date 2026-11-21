# Novo Serviço Route (`servicos/novo`)

## Overview
Next.js App Router page for creating a new clinic service. Loads all rooms and users in parallel and renders `ServicoForm` in create mode wired to `createServico`.

## Interface
- `[page.tsx:NovoServicoPage]` — Default exported async page component (no props).
- Rendered child component `ServicoForm` (imported, not defined in `page.tsx`) receiving `action={createServico}`, `mode="create"`, `salas={salas}`, and `usuarios={usuarios}`.

## Invariants
- None

## Side Effects
- `[page.tsx:NovoServicoPage]` — Calls `listSalas()` from `@/actions/salas` inside `Promise.all`.
- `[page.tsx:NovoServicoPage]` — Calls `listAllUsuarios()` from `@/actions/usuarios` inside `Promise.all`.

## Verification
- Run: `npm test`
