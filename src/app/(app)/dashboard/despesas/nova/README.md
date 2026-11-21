# Nova Despesa Route (`dashboard/despesas/nova`)

## Overview
Next.js App Router page for registering a new expense. Initializes default date and pending status values and renders `DespesaForm` in create mode wired to `createDespesa`.

## Interface
- `[page.tsx:NovaDespesaPage]` — Default exported page component (no props).
- Rendered child component `DespesaForm` (imported, not defined in `page.tsx`) (`@/components/despesas/despesa-form`) receiving `action={createDespesa}`, `hoje`, `mode="create"`, and `defaultValues` (`descricao`, `categoria`, `valor`, `data`, `status`, `pagoEm`, `fornecedor`, `numeroDocumento`, `observacao`).

## Invariants
- `[page.tsx:NovaDespesaPage]` — Computes `hoje` via `toDateInputValue(new Date())` and initializes `defaultValues` with `data: hoje`, `pagoEm: hoje`, `status: "PENDENTE"`, and `""` for `descricao`, `categoria`, `valor`, `fornecedor`, `numeroDocumento`, and `observacao`.

## Side Effects
- None

## Verification
- Run: `npm test`
