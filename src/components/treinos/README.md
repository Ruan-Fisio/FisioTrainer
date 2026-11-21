# Treinos Components

## Overview
Provides UI components for managing workout templates (`treinos`) and patient-assigned workout copies, including searchable/paginated template listings, a nested day/exercise workout builder form, an exercise combobox picker, template-to-patient assignment dialogs, patient workout cards and lists, row actions (edit, deactivate, delete), and shared workout link copying.

## Interface
- `[atribuir-treino-button.tsx:AtribuirTreinoButton]`: Client component (`"use client"`) accepting `{ pacienteId: string }`; renders `ShareButton`, an `"Atribuir treino"` button, and `AtribuirTreinoDialog` bound to `pacienteIdFixo={pacienteId}`.
- `[atribuir-treino-dialog.tsx:AtribuirTreinoDialog]`: Client component (`"use client"`) accepting `{ open: boolean; onOpenChange: (open: boolean) => void; treinoIdsIniciais?: string[]; pacienteIdFixo?: string }`.
- `[exercicio-picker.tsx:ExercicioOption]`: Type `{ id: string; name: string; links: { id: string; url: string }[] }`.
- `[exercicio-picker.tsx:ExercicioPicker]`: Client component (`"use client"`) accepting `{ options: ExercicioOption[]; value: string; onChange: (id: string) => void }`.
- `[share-button.tsx:ShareButton]`: Client component (`"use client"`) accepting `{ pacienteId: string }`.
- `[treino-filters.tsx:TreinoFilters]`: Component accepting `{ search: string }`; wraps `SearchInput` with `defaultValue={search}` and placeholder `"Buscar por nome..."`.
- `[treino-form.tsx:TreinoForm]`: Client component (`"use client"`) accepting `{ action: (prevState: TreinoFormState, formData: FormData) => Promise<TreinoFormState>; exercicioOptions: ExercicioOption[]; defaultValues?: DefaultValues; mode: "create" | "edit"; backHref: string; submitLabel?: string }`.
- `[treino-list-item.tsx:TreinoTableRow]`: Client component (`"use client"`) accepting `{ id: string; nome: string; descricao: string | null; diasCount: number; copiasCount: number }`.
- `[treino-list-item.tsx:TreinoCard]`: Client component (`"use client"`) accepting `{ id: string; nome: string; descricao: string | null; diasCount: number; copiasCount: number }`.
- `[treino-paciente-card.tsx:TreinoPacienteCard]`: Component accepting `{ treino: Awaited<ReturnType<typeof listTreinosPaciente>>[number]; pacienteId: string }`.
- `[treino-paciente-row-actions.tsx:TreinoPacienteRowActions]`: Client component (`"use client"`) accepting `{ id: string; pacienteId: string; nome: string }`.
- `[treino-row-actions.tsx:TreinoRowActions]`: Client component (`"use client"`) accepting `{ id: string; nome: string }`.
- `[treinos-paciente-list.tsx:TreinosPacienteList]`: Component accepting `{ treinos: Awaited<ReturnType<typeof listTreinosPaciente>>; pacienteId: string }`.
- `[treinos-table.tsx:TreinosTable]`: Async server component accepting `{ page: number; search: string }`.

## Invariants
- `[atribuir-treino-dialog.tsx:handleSubmit]`: Blocks client submission unless `treinoIds.length > 0` and `pacienteId` is truthy; resets `treinoIds` to `treinoIdsIniciais` on dialog open, omits patient selector and skips `listAllPacientes` when `pacienteIdFixo` is supplied (otherwise defaults `pacienteId` to `pacientesData[0].id`), and submits hidden `treinoIds` (`JSON.stringify`) and `pacienteId` inputs.
- `[exercicio-picker.tsx:ExercicioPicker]`: Marks the selected item with `data-checked={value === option.id}` and closes the popover immediately after invoking `onChange(option.id)`.
- `[share-button.tsx:handleShare]`: Formats the shared URL as `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/compartilhado/treinos/${pacienteId}`.
- `[treino-form.tsx:fromDefaultValues]`: Uses deterministic index-based keys (`dia-${diaIndex}`, `${diaKey}-ex-${exercicioIndex}`) during initial state hydration (reserving random `novaChave` for client interactions) and guarantees at least one day and one exercise per day.
- `[treino-form.tsx:TreinoForm]`: Disables day removal when `dias.length === 1` and exercise removal when `dia.exercicios.length === 1`; enforces HTML constraints `nome` `required`, `descricao` `maxLength={280}`, `series` `min="1"`, `carga` `min="0" step="0.5"`, and `descanso` `min="0" step="1"`.
- `[treino-form.tsx:diasPayload]`: Serialized hidden `dias` JSON omits exercises without `exercicioId` and days without any selected exercise, converting non-empty numeric fields via `Number(...)` and empty optional fields to `undefined`.
- `[treino-paciente-card.tsx:TreinoPacienteCard]`: Always sorts `treino.dias` via `ordenarPorDiaSemana` before rendering.
- `[treino-paciente-row-actions.tsx:TreinoPacienteRowActions]`: Edit links to `/pacientes/${pacienteId}/treinos/${id}/editar`; deactivate and delete confirm buttons are disabled while `isPending` is `true`; deletion requires confirmation dialog.
- `[treino-row-actions.tsx:TreinoRowActions]`: Calls `event.stopPropagation()` on container click to prevent parent row/card navigation; edit links to `/treinos/${id}/editar`; initializes assignment dialog with `treinoIdsIniciais={[id]}`; disables delete confirm while `isPending` is `true`.
- `[treinos-paciente-list.tsx:TreinosPacienteList]` and `[treinos-table.tsx:TreinosTable]`: Render empty-state cards when their input arrays are empty; `TreinosTable` renders responsive mobile `TreinoCard` (`md:hidden`) and desktop `Table` with `TreinoTableRow` (`hidden md:block`).

## Side Effects
- `[atribuir-treino-dialog.tsx:useEffect]`: Invokes server actions `listAllTreinos()` and (when `!pacienteIdFixo`) `listAllPacientes()` when `open` becomes `true`.
- `[atribuir-treino-dialog.tsx:AtribuirTreinoDialog]`: Submits to server action `assignTreino` via `useActionState`, showing `toast.success(...)` and closing dialog on success or `toast.error(...)` on client validation failure.
- `[share-button.tsx:handleShare]`: Writes share URL via `navigator.clipboard.writeText(shareUrl)` and triggers `toast.success(...)` or `toast.error(...)`.
- `[treino-form.tsx:TreinoForm]`: Submits `FormData` to `action` via `useActionState`; on `state.success` triggers `toast.success(...)` and calls `router.push(backHref)`; `FormActions` cancel also calls `router.push(backHref)`.
- `[treino-list-item.tsx:TreinoTableRow]` and `[treino-list-item.tsx:TreinoCard]`: Navigate to `/treinos/${id}` via `router.push` on click.
- `[treino-paciente-row-actions.tsx:handleDesativar]` and `[treino-paciente-row-actions.tsx:handleDelete]`: Call server actions `desativarTreinoPaciente(id, pacienteId)` and `deleteTreinoPaciente(id, pacienteId)` inside `startTransition`, triggering toast feedback (and closing dialog on delete).
- `[treino-row-actions.tsx:handleDelete]`: Calls server action `deleteTreino(id)` inside `startTransition`, showing toast feedback and closing dialog on success.
- `[treinos-table.tsx:TreinosTable]`: Calls `await listTreinos({ q: search }, page)` during server render.

## Verification
- Run: `npm test`
