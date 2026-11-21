# Detalhe do Treino Route (`treinos/[id]`)

## Overview
Dynamic Next.js App Router detail page displaying a workout template's name, optional description, edit link (`/treinos/${id}/editar`), and weekday-ordered exercise lists with formatted sets/reps/load/rest, instructions, and link preview cards.

## Interface
- `[page.tsx:TreinoDetailPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- `[page.tsx:TreinoDetailPage]` — Renders a link to `/treinos/${id}/editar` inside `Button`, `Badge` per weekday, and `LinkPreviewCard` per exercise reference link.
- Subdirectories:
  - `editar`: [./editar/README.md](./editar/README.md) — Edit this workout template.

## Invariants
- `[page.tsx:TreinoDetailPage]` — Invokes `notFound()` when `getTreino(id)` returns falsy (`if (!treino) notFound()`).
- `[page.tsx:TreinoDetailPage]` — Sorts `treino.dias` via `ordenarPorDiaSemana(treino.dias)` and renders weekday labels via `DIA_SEMANA_LABELS[dia.diaSemana]`.
- `[page.tsx:TreinoDetailPage]` — Formats exercise parameters by passing `exercicio.carga?.toString()` to `formatarCarga` and `exercicio.descanso` to `formatarDescanso`, filtering falsy values and joining with `" · "`.

## Side Effects
- `[page.tsx:TreinoDetailPage]` — Calls `getTreino(id)` from `@/actions/treinos`.

## Verification
- Run: `npm test`
