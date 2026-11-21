# evolucoes

## Overview
UI components for clinical evolutions (`evoluções`): a create/edit form with automatic vital-sign unit formatting (`EvolucaoForm`), detail-page PDF/edit/delete controls (`EvolucaoDetailActions`), per-row view/edit/delete controls (`EvolucaoRowActions`), a patient-scoped list (`EvolucoesList`), and an async server paginated/filterable responsive table (`EvolucoesTable`).

## Interface
- `[evolucao-detail-actions.tsx:EvolucaoDetailActions]` — Client Component (`{ id: string; pacienteId: string }`) providing report PDF download, edit navigation, and delete confirmation dialog.
- `[evolucao-form.tsx:EvolucaoForm]` — Client Component (`{ action: (prevState: EvolucaoActionState, formData: FormData) => Promise<EvolucaoActionState>; defaultValues?: Record<string, string>; pacienteId: string; mode: "create" | "edit" }`).
- `[evolucao-row-actions.tsx:EvolucaoRowActions]` — Client Component (`{ id: string; pacienteId: string }`) providing view, edit, and delete confirmation controls.
- `[evolucoes-list.tsx:EvolucoesList]` — Component (`{ pacienteId: string; evolucoes: Awaited<ReturnType<typeof getEvolucoesByPaciente>> }`) rendering a patient's evolutions list.
- `[evolucoes-table.tsx:EvolucoesTable]` — Async Server Component (`{ page: number; pacienteIds: string[]; profissionalIds: string[]; de?: string; ate?: string }`) fetching and rendering paginated evolutions across mobile cards and desktop table views.

## Invariants
- `[evolucao-detail-actions.tsx:EvolucaoDetailActions]` — PDF download anchor targets `/api/evolucoes/${id}/relatorio` (`target="_blank" rel="noopener noreferrer"`); edit link targets `/pacientes/${pacienteId}/evolucoes/${id}/editar`; delete confirm button is disabled while `isPending` is true.
- `[evolucao-form.tsx:EvolucaoForm]` — Marks `hdp`, `hda` (`TEXT_FIELDS`), `pa`, `fc`, `spo2`, `fr`, `temperatura` (`VITAL_FIELDS`), and `evolucao`, `conduta` (`EVOLUCAO_FIELDS`) as HTML `required`; `auscultaPulmonar` is optional; `mode` (`"create" | "edit"`) controls submit button label and success toast copy.
- `[evolucao-form.tsx:VITAL_UNITS]` — Maps vital-sign suffixes strictly to `pa` -> `"mmHg"` (spaced), `fc` -> `"bpm"` (spaced), `spo2` -> `"%"` (unspaced), `fr` -> `"irpm"` (spaced), and `temperatura` -> `"°C"` (unspaced); `[evolucao-form.tsx:stripVitalSuffix]` strips trailing unit suffixes case-insensitively on focus and `[evolucao-form.tsx:formatVital]` re-appends them on blur (returning `""` for blank values).
- `[evolucao-row-actions.tsx:EvolucaoRowActions]` — Links view to `/pacientes/${pacienteId}/evolucoes/${id}` and edit to `/pacientes/${pacienteId}/evolucoes/${id}/editar`; requires modal confirmation for delete and disables confirm while `isPending` is true.
- `[evolucoes-list.tsx:EvolucoesList]` — Renders an empty-state card when `evolucoes.length === 0`; otherwise links each item to `/pacientes/${pacienteId}/evolucoes/${evolucao.id}`.
- `[evolucoes-table.tsx:EvolucoesTable]` — Renders an empty-state card when `evolucoes.length === 0`; otherwise renders mobile cards (`md:hidden`), desktop table (`hidden md:block`), patient links (`/pacientes/${evolucao.pacienteId}`), `EvolucaoRowActions`, and `PaginationControls`.

## Side Effects
- `[evolucao-detail-actions.tsx:handleDelete]` — Invokes server action `deleteEvolucao(id, pacienteId)` inside `startTransition`, displays `toast.success` or `toast.error`, closes the dialog, and navigates to `/pacientes/${pacienteId}` via `router.push` on success.
- `[evolucao-form.tsx:EvolucaoForm]` — Submits `FormData` to `action` via `useActionState`; in `useEffect` on `state.success`, emits `toast.success` and navigates to `/pacientes/${pacienteId}` via `router.push`; cancel also navigates via ``router.push(`/pacientes/${pacienteId}`)``.
- `[evolucao-row-actions.tsx:handleDelete]` — Invokes server action `deleteEvolucao(id, pacienteId)` inside `startTransition`, displays `toast.success` or `toast.error`, and closes the dialog on success.
- `[evolucoes-table.tsx:EvolucoesTable]` — Awaits server query `listEvolucoes({ pacienteIds, profissionalIds, de, ate }, page)` during render.

## Verification
- Run: `npm test`
