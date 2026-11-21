# Editar Plano Route (`planos/[id]`)

## Overview
Dynamic Next.js App Router page for editing an existing plan. Loads the plan by `id` and all clinic rooms in parallel, formats numeric/currency fields and room associations, and renders `PlanoForm` in edit mode bound to `updatePlano`.

## Interface
- `[page.tsx:EditarPlanoPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- Rendered child component `PlanoForm` (imported, not defined in `page.tsx`) receiving `action={updatePlano.bind(null, id)}`, `salas={salas}`, formatted `defaultValues`, and `mode="edit"`.

## Invariants
- `[page.tsx:EditarPlanoPage]` — Invokes `notFound()` when `getPlano(id)` returns falsy (`if (!plano) notFound()`).
- `[page.tsx:EditarPlanoPage]` — Binds route `id` as the first argument to `updatePlano` (`updatePlano.bind(null, id)`).
- `[page.tsx:EditarPlanoPage]` — Transforms `plano` into `defaultValues`: coalesces `descricao` and each room `s.descricao` with `?? ""`, stringifies `atendimentos` and `creditosRemarcacao` via `String(...)`, formats `valorAVistaMensal` and `valorAVistaTrimestral` with `.toFixed(2).replace(".", ",")`, and maps `plano.salas` to `{ salaId, descricao }`.

## Side Effects
- `[page.tsx:EditarPlanoPage]` — Calls `getPlano(id)` from `@/actions/planos` inside `Promise.all`.
- `[page.tsx:EditarPlanoPage]` — Calls `listSalas()` from `@/actions/salas` inside `Promise.all`.

## Verification
- Run: `npm test`
