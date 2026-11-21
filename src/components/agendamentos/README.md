# agendamentos

## Overview
Appointment UI components and display mappings for the clinic schedule: modality/status/recurrence label maps (`agendamento-labels.ts`), URL-synced calendar/list tab navigation (`AgendaTabs`), an async server paginated appointments list (`AgendamentosTable`), reusable monthly availability and time-slot pickers (`CalendarioDisponibilidade`, `GradeHorariosDisponiveis`), and a two-step appointment rescheduling wizard and modal (`RemarcarConteudo`, `RemarcarDialog`), complementing the read-only calendar grid views in `./calendario`.

## Interface
- `[agendamento-labels.ts:MODALIDADE_AGENDAMENTO_LABEL]` — `Record` mapping modality keys (`EDUCACAO_FISICA`, `FISIOTERAPIA`, `AVALIACAO`, `TERAPIA_MANUAL`, `OUTRO`) to PT-BR labels.
- `[agendamento-labels.ts:modalidadeAgendamentoLabel]` — Resolves display label for a modality, returning `servicoNome` for `"OUTRO"` (falling back to `"Outro"`).
- `[agendamento-labels.ts:STATUS_AGENDAMENTO_LABEL]` — `Record` mapping `AGENDADO`, `COMPARECEU`, `FALTOU`, and `CANCELADO` to badge labels and Tailwind classes.
- `[agendamento-labels.ts:REPETICAO_LABEL]`, `[agendamento-labels.ts:UNIDADE_RECORRENCIA_LABEL]`, `[agendamento-labels.ts:DIA_SEMANA_LABEL]` — Recurrence preset labels, singular/plural unit labels, and single-letter weekday abbreviations (`["D", "S", "T", "Q", "Q", "S", "S"]`).
- `[agenda-tabs.tsx:AgendaTabs]` — Client Component switching between `"calendario"` and `"lista"` panels synced with the `tab` query parameter.
- `[agendamentos-table.tsx:AgendamentosTable]` — Async Server Component fetching and rendering filtered, paginated appointments in mobile card and desktop table layouts with `PaginationControls`.
- `[calendario-disponibilidade.tsx:DiaDisp]` & `[calendario-disponibilidade.tsx:CalendarioDisponibilidade]` — Daily availability DTO (`{ data, temHorarios, vagas, lotado }`) and 7-column monthly availability calendar picker.
- `[grade-horarios-disponiveis.tsx:SlotDisponivel]` & `[grade-horarios-disponiveis.tsx:GradeHorariosDisponiveis]` — Slot DTO (`{ horario, vagas, capacidade }`) and selectable time-slot grid with loading and empty states.
- `[remarcar-conteudo.tsx:RemarcarAlvo]` & `[remarcar-conteudo.tsx:RemarcarConteudo]` — Reschedule target DTO (`{ id, titulo, modalidade, profissionalId, dataInicio, dataFim, planoAtribuicaoId }`) and 2-step rescheduling wizard (day -> time slot, optional plan justification, and no-credit override confirmation).
- `[remarcar-dialog.tsx:RemarcarDialog]` — Client Component rendering a `"Remarcar"` trigger button and controlled `Dialog` wrapping `RemarcarConteudo`.
- Subdirectory: [calendario](./calendario/README.md) — Read-only appointment calendar views (`CalendarioNav`, `CalendarioMes`, `CalendarioSemana`, `CalendarioDia`, `GradeHoraria`, `EventoChip`, `EventoCalendario`).

## Invariants
- `[agendamento-labels.ts:modalidadeAgendamentoLabel]` — Custom services (`modalidade === "OUTRO"`) display `servicoNome` with fallback to `MODALIDADE_AGENDAMENTO_LABEL.OUTRO`; unknown modalities fall back to the raw string.
- `[agenda-tabs.tsx:AgendaTabs]` — Preserves existing URL query parameters and mutates only `tab` (`"calendario"` or `"lista"`).
- `[agendamentos-table.tsx:AgendamentosTable]` — Assumes every returned `agendamento.status` key exists in `STATUS_AGENDAMENTO_LABEL`; `[agendamentos-table.tsx:Participantes]` formats 0 patients as `"Sem paciente"`, 1 patient by name, and multiple as `"<first> +<rest>"`.
- `[calendario-disponibilidade.tsx:CalendarioDisponibilidade]` — Enables a day cell (`disponivel`) only when it belongs to `mesRef`, is not before local today (`ds < hoje`), `!bloqueado`, `info?.temHorarios` is truthy, and `!info.lotado`; disables grid interaction (`pointer-events-none opacity-50`) while `carregando` is true.
- `[grade-horarios-disponiveis.tsx:GradeHorariosDisponiveis]` — Marks slots with `s.vagas <= 0` as full (`cheio`), disabled, and struck-through.
- `[remarcar-conteudo.tsx:RemarcarConteudo]` — Requires `justificativa.trim().length >= 3` when `agendamento.planoAtribuicaoId != null` (`exigeJustificativa`), clearing `confirmarSemCredito` on edits; excludes `agendamento.id` when checking availability and conflicts so the event does not conflict with itself.
- `[remarcar-conteudo.tsx:INICIO_EXPEDIENTE]` — For non-fixed modalities (`!temHorarioFixo(agendamento.modalidade)`), generates 30-minute slots (`PASSO_MINUTOS`) from `07:00` (420 min) to `21:00` (`FIM_EXPEDIENTE`, 1260 min) fitting `minutos + duracaoMinEvento <= FIM_EXPEDIENTE`, marking slots unavailable (`vagas: 0`) when overlapping busy intervals or in the past on today's date.
- `[remarcar-conteudo.tsx:confirmar]` — Computes `horaFim` from `hora + slotSelecionado.duracaoMin`; attempts submission with `forcar = false` first and offers `forcar = true` only if the server returns `res.requiresConfirmacao`.
- `[remarcar-dialog.tsx:RemarcarDialog]` — Rounds duration in minutes via `Math.round((dataFim - dataInicio) / 60000)` and closes on both `onCancel` and `onSuccess`.

## Side Effects
- `[agenda-tabs.tsx:mudarTab]` — Navigates via `router.push` with updated `?tab=` query parameter.
- `[agendamentos-table.tsx:AgendamentosTable]` — Awaits server action `listAgendamentos` during server render.
- `[remarcar-conteudo.tsx:useEffect]` — Calls server action `getDisponibilidadeMes` for step `"dia"`, and calls `getDisponibilidadeHorarios` (fixed modalities) or `getAgendamentosDoDia` (free modalities) for step `"horario"`.
- `[remarcar-conteudo.tsx:confirmar]` — Calls server action `remarcarAgendamento`, emits `toast.success` via `sonner`, and invokes `onSuccess()`.

## Verification
- Run: `npm test`
