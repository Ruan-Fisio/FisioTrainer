# cobrancas

## Overview
UI components for billing charges (`cobrancas`): a create/edit form (`CobrancaForm`), per-row payment/sharing/edit/delete actions (`CobrancaRowActions`), a global pending-charges responsive list (`CobrancasList`), and a patient-scoped charge view grouped by active plans, ad-hoc charges, and finalized plans (`PacienteCobrancasList`, `statusCobranca`).

## Interface
- `[cobranca-form.tsx:CobrancaForm]` — Client Component accepting `{ action: (prevState: CobrancaActionState, formData: FormData) => Promise<CobrancaActionState>; defaultValues?: { planoNome: string; valor: string; vencimento: string; status: string; observacao: string; notaFiscal?: boolean }; pacienteId: string; mode: "create" | "edit" }`.
- `[cobranca-row-actions.tsx:CobrancaRowActions]` — Client Component accepting `{ id: string; pacienteId: string; pago: boolean; mensagemCobranca?: string; telefonePaciente?: string | null }`; provides WhatsApp/clipboard sharing, mark-as-paid dialog, edit link, and delete confirmation dialog.
- `[cobrancas-list.tsx:CobrancasList]` — Server-compatible component accepting `{ cobrancas: Awaited<ReturnType<typeof listCobrancasPendentes>>; cnpjPix?: string | null }`; renders pending charges in mobile cards and desktop table layouts.
- `[paciente-cobrancas-list.tsx:statusCobranca]` — Helper accepting `{ status: string; vencimento: Date }` and returning `{ label: "Pago" | "Atrasado" | "Pendente"; variant: "secondary" | "destructive" | "outline" }`.
- `[paciente-cobrancas-list.tsx:PacienteCobrancasList]` — Server-compatible component accepting `{ pacienteId: string; pacienteNome: string; pacienteContato: string | null; cobrancas: Awaited<ReturnType<typeof getCobrancasByPaciente>>; atribuicoes?: Awaited<ReturnType<typeof listPlanoAtribuicoesByPaciente>>; cnpjPix?: string | null; somenteLeitura?: boolean }`.

## Invariants
- `[cobranca-form.tsx:valorFinal]` — Parses Brazilian currency strings by stripping `"."` and replacing `","` with `"."`; returns `0` when `Number.isNaN(numero)`, otherwise applies `aplicarTaxaNotaFiscal(numero, notaFiscal)`.
- `[cobranca-form.tsx:CobrancaForm]` — Marks `planoNome`, `valor`, and `vencimento` as HTML `required`; restricts `status` to `"PENDENTE"` (default) or `"PAGO"`; serializes `notaFiscal` via a hidden input (`String(notaFiscal)`); shows the tax-adjusted preview only when `notaFiscal && valorFinal > 0`.
- `[cobranca-row-actions.tsx:CobrancaRowActions]` — Renders share/copy action only when `mensagemCobranca` is truthy (prefers WhatsApp link via `montarLinkWhatsapp`, else clipboard copy); hides `"Marcar como paga"` when `pago` is true; disables confirmation actions while `isPending` is true.
- `[cobrancas-list.tsx:CobrancasList]` — Renders an empty-state message when `cobrancas.length === 0`; always passes `pago={false}` to `CobrancaRowActions`; renders installment suffix only when both `numeroParcela` and `totalParcelas` are truthy.
- `[paciente-cobrancas-list.tsx:statusCobranca]` — Classifies `status === "PAGO"` as `"Pago"` regardless of due date; otherwise compares `cobranca.vencimento < hoje` (local midnight via `hoje.setHours(0, 0, 0, 0)`) to yield `"Atrasado"` vs `"Pendente"`.
- `[paciente-cobrancas-list.tsx:PacienteCobrancasList]` — Renders an empty-state message when `cobrancas.length === 0`; omits `atribuicoes` with zero matching charges; orders sections as `ATIVO` groups (`defaultOpen={true}`), ad-hoc charges (`!c.planoAtribuicaoId`, `defaultOpen={true}`, omitted if empty), and non-`ATIVO` groups (`defaultOpen={false}`); omits `CobrancaRowActions` when `somenteLeitura` is truthy.
- `[paciente-cobrancas-list.tsx:GrupoCobrancas]` — Counts paid charges via `c.status === "PAGO"` and maps `statusBadge` through `statusAtribuicaoLabels` (`"ATIVO"`, `"CANCELADO"`, `"CONCLUIDO"`) with raw fallback.

## Side Effects
- `[cobranca-form.tsx:CobrancaForm]` — Submits `FormData` to `action` via `useActionState`; cancel navigates via ``router.push(`/pacientes/${pacienteId}?tab=financeiro`)``.
- `[cobranca-form.tsx:useEffect]` — On truthy `state.success`, triggers `toast.success` (mode-specific) and navigates via ``router.push(`/pacientes/${pacienteId}?tab=financeiro`)``.
- `[cobranca-row-actions.tsx:handleCopiarMensagem]` — Writes `mensagemCobranca` to `navigator.clipboard.writeText` and emits `toast.success`.
- `[cobranca-row-actions.tsx:handleDelete]` — Calls server action `deleteCobranca(id, pacienteId)` inside `startTransition`, closing the dialog and emitting `toast.success` or `toast.error`.
- `[cobranca-row-actions.tsx:handlePagar]` — Calls server action `marcarCobrancaPaga(id, pacienteId)` inside `startTransition`, closing the dialog and emitting `toast.success` or `toast.error`.
- `[cobranca-row-actions.tsx:CobrancaRowActions]` — Opens external WhatsApp URLs (`target="_blank" rel="noopener noreferrer"`) and navigates to `/pacientes/${pacienteId}/cobrancas/${id}/editar` via Next.js `Link`.
- `[paciente-cobrancas-list.tsx:statusCobranca]` — Reads wall-clock time via `new Date()` to evaluate overdue status.

## Verification
- Run: `npm test`
