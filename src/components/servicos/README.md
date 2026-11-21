# Servicos Components

## Overview
Provides UI components for managing clinic services (`Serviços`): a client create/edit form (`ServicoForm`) configuring pricing, room capacities, and enabled professionals; row actions (`ServicoRowActions`) with guarded deletion; and an async server table component (`ServicosTable`) displaying paginated services in responsive card and table layouts.

## Interface
- `[servico-form.tsx:ServicoForm]`: Client component (`"use client"`) accepting `{ action: (prevState: ServicoActionState, formData: FormData) => Promise<ServicoActionState>; defaultValues?: { nome: string; ativo: boolean; valorPadrao: string; taxaProfissionalPercentual: string; salas: { salaId: string; capacidade: string; descricao: string }[]; profissionais: string[] }; mode: "create" | "edit"; salas: Awaited<ReturnType<typeof listSalas>>[number][]; usuarios: Awaited<ReturnType<typeof listAllUsuarios>>[number][] }`.
- `[servico-row-actions.tsx:ServicoRowActions]`: Client component (`"use client"`) accepting `{ id: string; nome: string; agendamentosCount: number }`.
- `[servicos-table.tsx:ServicosTable]`: Async server component accepting `{ page: number; search: string }`.

## Invariants
- `[servico-form.tsx:ServicoForm]`: Initializes `ativo` to `defaultValues?.ativo ?? true`, `salasSelecionadas` to `defaultValues?.salas ?? []`, and `profissionaisSelecionados` to `defaultValues?.profissionais ?? []`.
- `[servico-form.tsx:toggleSala]`: Selecting an unselected `salaId` appends `{ salaId, capacidade: "1", descricao: "" }`; selecting an already selected `salaId` removes it.
- `[servico-form.tsx:ServicoForm]`: Serializes `salasSelecionadas` and `profissionaisSelecionados` via `JSON.stringify` into hidden inputs named `salas` and `profissionais`; enforces HTML `required` on `nome`, `valorPadrao` (`inputMode="decimal"`), and `taxaProfissionalPercentual` (`inputMode="decimal"`), and constrains room capacity inputs to `type="number"`, `min={1}`, `step={1}`.
- `[servico-row-actions.tsx:inUse]`: Computes `inUse = agendamentosCount > 0`; when `true`, disables the delete button inside a `Tooltip` and omits the delete confirmation `Dialog`.
- `[servico-row-actions.tsx:ServicoRowActions]`: Disables the delete confirmation button while `isPending` (`useTransition`) is `true`.
- `[servicos-table.tsx:ServicosTable]`: When `servicos.length === 0`, renders only an empty-state `Card` (`Nenhum serviço encontrado.`) without table, mobile cards, total count, or `PaginationControls`.

## Side Effects
- `[servico-form.tsx:ServicoForm]`: Submits `FormData` via `useActionState(action, initialState)`; on `state.success` in `useEffect`, calls `toast.success(...)` and navigates via `router.push("/servicos")`; `FormActions` `onCancel` also navigates to `/servicos`.
- `[servico-row-actions.tsx:handleDelete]`: Calls server action `deleteServico(id)` inside `startTransition`, showing `toast.success(...)` and closing the dialog on success or `toast.error(...)` on error; edit action links to `/servicos/${id}`.
- `[servicos-table.tsx:ServicosTable]`: Calls `await listServicos({ q: search }, page)` during server render.

## Verification
- Run: `npm test`
