# despesas

## Overview
UI components for clinic expense management (`despesas`): a controlled create/edit form (`DespesaForm`), per-row payment and deletion dialogs (`DespesaRowActions`), an async server dashboard tab with monthly KPIs, overdue items from other months, category breakdown, and filters (`DespesasTab`), and an async server paginated responsive list (`DespesasTable`).

## Interface
- `[despesa-form.tsx:DespesaFormValues]` — Form value shape with string fields `descricao`, `categoria`, `valor`, `data`, `status`, `pagoEm`, `fornecedor`, `numeroDocumento`, and `observacao`.
- `[despesa-form.tsx:DespesaForm]` — Client Component accepting `{ action: (prevState: DespesaActionState, formData: FormData) => Promise<DespesaActionState>; defaultValues: DespesaFormValues; hoje: string; mode: "create" | "edit" }`.
- `[despesa-row-actions.tsx:DespesaRowActions]` — Client Component accepting `{ id: string; pago: boolean }`.
- `[despesas-tab.tsx:DespesasTab]` — Async Server Component accepting `{ filtros: FiltrosDespesas; page: number }`.
- `[despesas-table.tsx:DespesasTable]` — Async Server Component accepting `{ filtros: FiltrosDespesas; page: number }`.

## Invariants
- `[despesa-form.tsx:valores]` — All form fields are controlled via `useState(defaultValues)` so entered values persist across server-action validation errors.
- `[despesa-form.tsx:DespesaForm]` — Marks `descricao`, `categoria` (with disabled empty placeholder), `valor`, and `data` as HTML `required`; restricts `status` to `"PENDENTE"` or `"PAGO"`; renders `pagoEm` only when `valores.status === "PAGO"`, marking it `required` with `max={hoje}`.
- `[despesa-row-actions.tsx:DespesaRowActions]` — Renders the mark-as-paid button and dialog only when `!pago`; disables payment and deletion confirm buttons while `isPending` is true; links editing to `/dashboard/despesas/${id}`.
- `[despesas-tab.tsx:DespesasTab]` — Applies `"danger"` KPI tone to `"Em atraso"` when `resumo.qtdAtrasadas > 0` (`"default"` otherwise); renders overdue-from-other-months card (with `pago={false}`) only when `atrasadasOutrosMeses.length > 0` and category breakdown only when `resumo.porCategoria.length > 0`.
- `[despesas-tab.tsx:DespesasTab]` — Wraps `DespesasTable` in `Suspense` keyed by `JSON.stringify({ filtros, page })` with `TableSkeleton` fallback; binds query params `"categorias"` (`CATEGORIAS_DESPESA`) and `"status"` (`"PENDENTE"` | `"PAGO"`); links `"Nova despesa"` to `/dashboard/despesas/nova`.
- `[despesas-table.tsx:StatusBadge]` — Maps `status === "PAGO"` to `"Paga"` (with optional formatted `pagoEm`), `despesaAtrasada(despesa)` to `"Em atraso"` (`destructive`), and otherwise `"A pagar"` (`outline`).
- `[despesas-table.tsx:DespesasTable]` — Renders an empty-state card without table or pagination when `despesas.length === 0`; otherwise renders mobile cards (`md:hidden`), desktop table (`hidden md:block`), and `PaginationControls`, passing `pago={despesa.status === "PAGO"}` to `DespesaRowActions`.

## Side Effects
- `[despesa-form.tsx:useActionState]` — Submits `FormData` to `action` on submit.
- `[despesa-form.tsx:useEffect]` — On truthy `state.success`, emits `toast.success` and navigates via ``router.push(`/dashboard?tab=despesas&mes=${state.mes}`)``; canceling via `[despesa-form.tsx:FormActions]` navigates via `router.push("/dashboard?tab=despesas")`.
- `[despesa-row-actions.tsx:handlePagar]` — Calls server action `marcarDespesaPaga(id)` in a transition, shows `toast.success` / `toast.error`, and closes the dialog on success.
- `[despesa-row-actions.tsx:handleDelete]` — Calls server action `deleteDespesa(id)` in a transition, shows `toast.success` / `toast.error`, and closes the dialog on success.
- `[despesas-tab.tsx:DespesasTab]` — Awaits `getResumoDespesas(filtros.mes)` on render and reads current time via `new Date()` for `mesReferencia`.
- `[despesas-table.tsx:DespesasTable]` — Awaits `listDespesas(filtros, page)` on render.

## Verification
- Run: `npm test`
