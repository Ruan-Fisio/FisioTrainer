# Planos Components

## Overview
Provides UI components for managing the service plan catalog and plan renewals: a create/edit form (`PlanoForm`), row actions with usage-guarded deletion (`PlanoRowActions`), a paginated catalog table (`PlanosTable`), URL-synced catalog/renewals tabs (`PlanosTabs`), a renewable assignments list (`RenovacoesList`), and a renewal confirmation dialog (`RenovarPlanoDialog`).

## Interface
- `[plano-form.tsx:PlanoForm]`: Client component (`"use client"`) accepting `{ action: (prevState: PlanoActionState, formData: FormData) => Promise<PlanoActionState>; defaultValues?: { nome: string; descricao: string; tipos: string[]; atendimentos: string; creditosRemarcacao: string; permiteParcelamentoEstendido: boolean; valores: Record<"valorAVistaMensal" | "valorAVistaTrimestral", string>; salas: { salaId: string; descricao: string }[] }; mode: "create" | "edit"; salas: Awaited<ReturnType<typeof listSalas>>[number][] }`.
- `[plano-row-actions.tsx:PlanoRowActions]`: Client component (`"use client"`) accepting `{ id: string; nome: string; atribuicoesCount: number }`.
- `[planos-table.tsx:PlanosTable]`: Async server component accepting `{ page: number; search: string }`.
- `[planos-tabs.tsx:PlanosTabs]`: Client component (`"use client"`) accepting `{ tab: string; catalogo: React.ReactNode; renovacoes: React.ReactNode }`.
- `[renovacoes-list.tsx:RenovacoesList]`: Async server component taking no props.
- `[renovar-plano-dialog.tsx:RenovarPlanoDialog]`: Client component (`"use client"`) accepting `{ atribuicaoId: string; pacienteNome: string; planoNome: string; maxParcelas: number }`.

## Invariants
- `[plano-form.tsx:PlanoForm]`: Initializes `tipos` to `defaultValues?.tipos ?? ["FISIOTERAPIA"]`, emits one hidden `name="tipos"` input per selected type, renders `"Selecione ao menos um tipo"` when `tipos.length === 0`, and enforces HTML `required` on `nome`, `atendimentos` (`min={1}`, `step={1}`), `creditosRemarcacao` (`min={0}`, `step={1}`, default `"0"`), and both `[plano-form.tsx:CAMPOS_VALOR]` inputs (`valorAVistaMensal`, `valorAVistaTrimestral`).
- `[plano-form.tsx:planoHibrido]`: Renders the `permiteParcelamentoEstendido` checkbox only when both `"FISIOTERAPIA"` and `"EDUCACAO_FISICA"` are selected; `[plano-form.tsx:permiteParcelamentoEstendidoEfetivo]` forces the hidden input value to `""` outside hybrid plans (`"on"` only when hybrid and checked).
- `[plano-form.tsx:salasSelecionadas]`: Serializes selected rooms (`{ salaId, descricao }[]`) via `JSON.stringify` into hidden input `name="salas"` and displays `"Selecione ao menos uma sala"` when empty.
- `[plano-row-actions.tsx:inUse]`: Blocks deletion when `atribuicoesCount > 0` by rendering a disabled delete button inside a `Tooltip` instead of the confirmation `Dialog`; edit link targets `/planos/${id}`.
- `[planos-table.tsx:PlanosTable]`: Renders an empty-state card (`"Nenhum plano encontrado."`) when `planos.length === 0`; otherwise renders mobile cards (`md:hidden`) and desktop table (`hidden md:block`), displays `"Parcelamento estendido"` badge only when `plano.permiteParcelamentoEstendido` is truthy, and passes `plano._count.atribuicoes` to `PlanoRowActions`.
- `[planos-tabs.tsx:PlanosTabs]`: Supports tab values `"catalogo"` and `"renovacoes"`; `[planos-tabs.tsx:mudarTab]` always deletes `"page"` and `"q"` query parameters when switching tabs.
- `[renovacoes-list.tsx:RenovacoesList]`: Renders an empty-state card (`"Nenhum plano para renovar no momento."`) when `planos.length === 0`; renders `RenovarPlanoDialog` only when `p.temPlano` is truthy (otherwise shows `"Plano removido do catálogo"`), and formats progress as `realizados/total` when `p.total != null` or `realizados` otherwise.
- `[renovar-plano-dialog.tsx:onOpenChange]`: Opening resets `primeiraData` to `toDateInputValue(inicioDoProximoMes())`, `numeroParcelas` to `"1"`, and clears `erro`.
- `[renovar-plano-dialog.tsx:parcelasValidas]`: Requires `Number.isInteger(parcelasNum) && parcelasNum >= 1 && parcelasNum <= maxParcelas`; disables confirm when `pending || !parcelasValidas || !primeiraData` and cancel when `pending`.

## Side Effects
- `[plano-form.tsx:PlanoForm]`: Submits `FormData` to `action` via `useActionState`; on `state.success` in `useEffect`, invokes `toast.success(...)` and navigates via `router.push("/planos")`; `FormActions` `onCancel` also navigates to `/planos`.
- `[plano-row-actions.tsx:handleDelete]`: Invokes server action `deletePlano(id)` inside `startTransition`, triggering `toast.success(...)` and closing dialog on success or `toast.error(...)` on catch.
- `[planos-table.tsx:PlanosTable]`: Invokes `await listPlanos({ q: search }, page)` during server render.
- `[planos-tabs.tsx:mudarTab]`: Navigates via ``router.push(`${pathname}?${params.toString()}`)`` on tab switch.
- `[renovacoes-list.tsx:RenovacoesList]`: Invokes `await listPlanosRenovaveis()` during server render; links patients to `/pacientes/${p.pacienteId}?tab=planos`.
- `[renovar-plano-dialog.tsx:renovar]`: Invokes server action `renovarPlanoAtribuicao(atribuicaoId, primeiraData, parcelasNum)` inside `startTransition`; sets inline error on `res.error`, or shows `toast.success(...)`, closes dialog, and calls `router.refresh()` on success.

## Verification
- Run: `npm test`
