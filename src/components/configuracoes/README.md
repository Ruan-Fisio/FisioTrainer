# configuracoes

## Overview
Client-side UI components for the clinic settings page: URL-synced responsive tab navigation (`ConfiguracoesTabs`), financial fee rate management (`FinanceiroConfig`), operating weekdays and holidays configuration (`FuncionamentoConfig`), per-modality attendance slot configuration (`HorariosAtendimentoCard`), and room capacity CRUD (`SalasConfig`).

## Interface
- `[configuracoes-tabs.tsx:ConfiguracoesTabs]` — Client Component accepting `{ tabs: { value: string; label: string; icon?: ReactNode; content: ReactNode }[]; defaultValue: string }`.
- `[financeiro-config.tsx:FinanceiroConfig]` — Client Component accepting `{ taxas: { id: string; chave: string; nome: string; percentual: number }[] }`.
- `[funcionamento-config.tsx:FuncionamentoConfig]` — Client Component accepting `{ dias: { diaSemana: DiaSemana; label: string; aberto: boolean }[]; feriados: { id: string; data: Date | string; descricao: string }[] }`.
- `[horarios-atendimento-card.tsx:HorariosAtendimentoCard]` — Client Component accepting `{ modalidade: string; horarios: { id: string; horario: string; duracaoMin: number; ativo: boolean }[]; sala: string; capacidade: number }`.
- `[salas-config.tsx:SalasConfig]` — Client Component accepting `{ salas: { id: string; nome: string; capacidadeEducacaoFisica: number; capacidadeFisioterapia: number }[] }`.

## Invariants
- `[configuracoes-tabs.tsx:ConfiguracoesTabs]` — Uses the `tab` query parameter only when it matches an entry in `tabs`; otherwise falls back to `defaultValue`.
- `[configuracoes-tabs.tsx:onValueChange]` — Selecting `defaultValue` deletes the `tab` query parameter; selecting any other tab sets `tab` to that value.
- `[financeiro-config.tsx:TaxaCard]` — Displays `taxa.percentual` formatted to 2 decimal places with a comma separator (`toFixed(2).replace(".", ",")`).
- `[financeiro-config.tsx:TaxaFormDialog]` — Enforces `required` and `inputMode="decimal"` on `percentual`, disables submission while `isPending`, and keeps the dialog open when `result.error` is returned.
- `[funcionamento-config.tsx:DiasSemanaCard]` — Disables all weekday checkboxes while `isPending`, dims only the pending weekday (`pendente === dia.diaSemana`), and always clears `pendente` in `finally`.
- `[funcionamento-config.tsx:formatarDataFeriado]` — Formats holiday dates via `formatarDataSemHora(data, "long")`.
- `[funcionamento-config.tsx:FeriadoFormDialog]` — Requires `data` (`type="date"`) and `descricao`, disables submit while `isPending`, and closes only when `result.error` is absent.
- `[funcionamento-config.tsx:ExcluirFeriadoButton]` — Requires modal confirmation before deletion and disables confirm while `isPending`.
- `[horarios-atendimento-card.tsx:HorariosAtendimentoCard]` — Resolves title via `MODALIDADE_AGENDAMENTO_LABEL[modalidade]`, disables active toggles and delete buttons while `isPending`, submits `modalidade` via hidden input, requires `horario` (`type="time"`), and bounds `duracaoMin` to `min={5}`, `max={480}`, `defaultValue={50}`.
- `[salas-config.tsx:SalasConfig]` — Prevents deleting the last remaining room (`podeExcluir={salas.length > 1}` passed as `desabilitado={!podeExcluir}` to `ExcluirSalaDialog`).
- `[salas-config.tsx:MODALIDADES]` — Restricts room capacities to `capacidadeEducacaoFisica` and `capacidadeFisioterapia`; `[salas-config.tsx:SalaFormDialog]` requires `nome` and bounds both numeric capacities to `min={0}`, `max={100}`, `defaultValue={valor ?? 1}`, keeping the dialog open on `result.error`.
- `[salas-config.tsx:ExcluirSalaDialog]` — Requires modal confirmation before deletion and disables trigger when `desabilitado` is true and confirm while `isPending`.

## Side Effects
- `[configuracoes-tabs.tsx:onValueChange]` — Updates browser URL without scroll via `router.replace(..., { scroll: false })`.
- `[financeiro-config.tsx:TaxaFormDialog]` — Calls server action `updateConfiguracaoTaxa(taxa.id, initial, formData)` in a transition and displays `toast.error` or `toast.success`.
- `[funcionamento-config.tsx:DiasSemanaCard]` — Calls server action `setDiaFuncionamento(diaSemana, aberto)` in a transition and displays `toast.error` on failure.
- `[funcionamento-config.tsx:FeriadoFormDialog]` — Calls server action `createFeriado(initial, formData)` in a transition and displays `toast.error` or `toast.success`.
- `[funcionamento-config.tsx:ExcluirFeriadoButton]` — Calls server action `deleteFeriado(id)` in a transition and displays `toast.success` or `toast.error`.
- `[horarios-atendimento-card.tsx:HorariosAtendimentoCard]` — Calls server action `createHorarioAtendimento` via `useActionState` and resets `formRef.current?.reset()` inside `useEffect` when `state.success` is truthy.
- `[horarios-atendimento-card.tsx:toggleAtivo]` — Calls server action `alternarAtivoHorarioAtendimento(id, ativo)` in a transition.
- `[horarios-atendimento-card.tsx:remover]` — Calls server action `deleteHorarioAtendimento(id)` in a transition and displays `toast.success`.
- `[salas-config.tsx:SalaFormDialog]` — Calls server action `updateSala(sala.id, initial, formData)` or `createSala(initial, formData)` in a transition and displays `toast.error` or `toast.success`.
- `[salas-config.tsx:ExcluirSalaDialog]` — Calls server action `deleteSala(id)` in a transition and displays `toast.success` or `toast.error`.

## Verification
- Run: `npm test`
