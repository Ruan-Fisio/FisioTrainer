# Editar Serviço Route (`servicos/[id]`)

## Overview
Dynamic Next.js App Router page for editing an existing clinic service. Loads the service by `id`, all rooms, and all users in parallel, formats currency/percentage values and room/professional associations, and renders `ServicoForm` in edit mode bound to `updateServico`.

## Interface
- `[page.tsx:EditarServicoPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- Rendered child component `ServicoForm` (imported, not defined in `page.tsx`) receiving `action={updateServico.bind(null, id)}`, `salas={salas}`, `usuarios={usuarios}`, formatted `defaultValues`, and `mode="edit"`.

## Invariants
- `[page.tsx:EditarServicoPage]` — Invokes `notFound()` when `getServico(id)` returns falsy (`if (!servico) notFound()`).
- `[page.tsx:EditarServicoPage]` — Binds route `id` as the first argument to `updateServico` (`updateServico.bind(null, id)`).
- `[page.tsx:EditarServicoPage]` — Transforms `servico` into `defaultValues`: formats `valorPadrao` and `taxaProfissionalPercentual` with `.toFixed(2).replace(".", ",")`, maps `servico.salas` to `{ salaId, capacidade: String(s.capacidade), descricao: s.descricao ?? "" }`, and maps `servico.profissionais` to `p.usuarioId`.

## Side Effects
- `[page.tsx:EditarServicoPage]` — Calls `getServico(id)` from `@/actions/servicos` inside `Promise.all`.
- `[page.tsx:EditarServicoPage]` — Calls `listSalas()` from `@/actions/salas` inside `Promise.all`.
- `[page.tsx:EditarServicoPage]` — Calls `listAllUsuarios()` from `@/actions/usuarios` inside `Promise.all`.

## Verification
- Run: `npm test`
