# Detalhe do Exame Route (`exames/[id]`)

## Overview
Dynamic Next.js App Router detail page displaying an exam template's name, modality badge, optional description, edit link (`/exames/${id}/editar`), and structured section/field/column cards.

## Interface
- `[page.tsx:ExameDetailPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- `[page.tsx:ExameDetailPage]` — Renders `Badge`, a link to `/exames/${id}/editar` inside `Button`, and `Card`/`CardHeader`/`CardTitle`/`CardContent` per exam section.
- Subdirectories:
  - `editar`: [./editar/README.md](./editar/README.md) — Collaboratively edit this exam template.

## Invariants
- `[page.tsx:ExameDetailPage]` — Invokes `notFound()` when `getExame(id)` returns falsy (`if (!exame) notFound()`).
- `[page.tsx:ExameDetailPage]` — Maps `exame.tipo === "FISIOTERAPIA"` to `"Fisioterapia"` and any other value to `"Educação Física"`.
- `[page.tsx:ExameDetailPage]` — Renders empty-state text when `exame.secoes.length === 0`.
- `[page.tsx:ExameDetailPage]` — Appends `(${coluna.formatacao})` to `coluna.titulo` only when `coluna.formatacao` is truthy.

## Side Effects
- `[page.tsx:ExameDetailPage]` — Calls `getExame(id)` from `@/actions/exames`.

## Verification
- Run: `npm test`
