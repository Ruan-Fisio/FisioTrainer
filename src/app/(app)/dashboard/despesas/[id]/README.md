# Editar Despesa Route (`dashboard/despesas/[id]`)

## Overview
Dynamic Next.js App Router page for editing an existing expense record. Fetches the expense via `getDespesa(id)`, normalizes currency and date fields for form inputs, and renders `DespesaForm` in edit mode bound to `updateDespesa`.

## Interface
- `[page.tsx:EditarDespesaPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- Rendered child component `DespesaForm` (imported, not defined in `page.tsx`) (`@/components/despesas/despesa-form`) receiving `action={updateDespesa.bind(null, id)}`, `hoje`, `mode="edit"`, and `defaultValues` (`descricao`, `categoria`, `valor`, `data`, `status`, `pagoEm`, `fornecedor`, `numeroDocumento`, `observacao`).

## Invariants
- `[page.tsx:EditarDespesaPage]` — Invokes `notFound()` if `getDespesa(id)` returns null/falsy (`if (!despesa) notFound()`).
- `[page.tsx:EditarDespesaPage]` — Serializes `valor` as a Brazilian decimal string via `despesa.valor.toFixed(2).replace(".", ",")`.
- `[page.tsx:EditarDespesaPage]` — Formats `hoje` via `toDateInputValue(new Date())` and `data` via `toDateInputValue(despesa.data)`, falls back `pagoEm` to `hoje` when `despesa.pagoEm` is falsy, and coalesces optional string fields (`fornecedor`, `numeroDocumento`, `observacao`) to `""`.
- `[page.tsx:EditarDespesaPage]` — Binds route param `id` to `updateDespesa` (`updateDespesa.bind(null, id)`).

## Side Effects
- `[page.tsx:EditarDespesaPage]` — Calls data loader `getDespesa(id)` imported from `@/actions/despesas`.

## Verification
- Run: `npm test`
