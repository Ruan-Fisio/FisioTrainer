# calendario

## Overview
Read-only appointment calendar UI package providing URL-driven navigation (`CalendarioNav`), a 7-column monthly grid (`CalendarioMes`), week/day wrappers (`CalendarioSemana`, `CalendarioDia`) over an aligned hourly grid (`GradeHoraria`), and an interactive detail-modal chip (`EventoChip`) typed by `EventoCalendario`. All scheduling mutations are excluded from this package.

## Interface
- `[types.ts:EventoCalendario]` — Appointment DTO type (`{ id, titulo, dataInicio, dataFim, diaInteiro, modalidade: ModalidadeAgendamento, status, serieId, planoAtribuicaoId, pacientes, profissional, sala, servico }`).
- `[calendario-dia.tsx:CalendarioDia]` — Component (`{ dataReferencia: Date, eventos: EventoCalendario[] }`) rendering a single-day `GradeHoraria`.
- `[calendario-semana.tsx:CalendarioSemana]` — Component (`{ inicio: Date, fim: Date, eventos: EventoCalendario[] }`) computing column days via `getDiasDaGrade(inicio, fim)` and rendering `GradeHoraria`.
- `[calendario-mes.tsx:CalendarioMes]` — Client Component (`{ inicio: Date, fim: Date, dataReferencia: Date, eventos: EventoCalendario[] }`) rendering a 7-column monthly grid with per-day chips and overflow popovers.
- `[calendario-nav.tsx:CalendarioNav]` — Client Component (`{ visao: VisaoCalendario, dataReferencia: Date, titulo: string }`) rendering previous/today/next controls, title, and `mes`/`semana`/`dia` view switcher.
- `[evento-chip.tsx:EventoChip]` — Client Component (`{ evento: EventoCalendario, className?: string }`) rendering a status-styled event trigger that opens a read-only details `Dialog`.
- `[grade-horaria.tsx:GradeHoraria]` — Client Component (`{ dias: Date[], eventos: EventoCalendario[] }`) rendering a multi-column hourly schedule with an optional all-day row.

## Invariants
- `[calendario-dia.tsx:CalendarioDia]` — Always passes a single-element array `[dataReferencia]` to `GradeHoraria`.
- `[calendario-semana.tsx:CalendarioSemana]` — Derives column days exclusively from `getDiasDaGrade(inicio, fim)`.
- `[calendario-mes.tsx:DIAS_SEMANA]` — Month grid is fixed to 7 columns (`grid-cols-7`) ordered Sunday through Saturday (`dom`..`sáb`).
- `[calendario-mes.tsx:eventosDoDia]` — Matches events to day cells using clinic-timezone calendar date range (`toDateInputValue(evento.dataInicio) <= alvo && alvo <= toDateInputValue(evento.dataFim)`) and sorts ascending by `dataInicio.getTime()`.
- `[calendario-mes.tsx:MAX_VISIVEIS]` — Renders at most 3 `EventoChip` items inline per day cell; remaining events collapse into a `+{restantes} mais` `Popover`.
- `[calendario-mes.tsx:CalendarioMes]` — Mutes cells where `!isSameMonth(dia, dataReferencia)` and highlights cells where `isToday(dia)`.
- `[calendario-nav.tsx:irPara]` — Preserves existing query params while always setting `data` via `toDateInputValue(novaData)`, conditionally setting `view` only when `novaVisao` is provided, and targeting `/agenda`.
- `[calendario-nav.tsx:navegar]` — Steps `dataReferencia` by `±1` month for `visao === "mes"`, `±1` week for `visao === "semana"`, and `±1` day otherwise.
- `[calendario-nav.tsx:CalendarioNav]` — View switcher buttons expose active state via `aria-pressed={visao === opcao.value}` for `VISOES` (`"mes"`, `"semana"`, `"dia"`).
- `[evento-chip.tsx:EventoChip]` — Strictly read-only: clicking only toggles local dialog state; unknown status keys fall back to `"bg-primary/15 text-primary hover:bg-primary/25"` and raw `evento.status`; optional rows (`profissional`, `sala`, `pacientes`) render only when present/non-empty.
- `[evento-chip.tsx:formatarIntervalo]` — All-day events (`evento.diaInteiro === true`) omit chip start time and display `"Dia inteiro"`; timed events show start time on the chip and `"HH:mm – HH:mm"` in the dialog.
- `[grade-horaria.tsx:GradeHoraria]` — Header, all-day row, and hourly rows share identical CSS `gridTemplateColumns` (`64px repeat(${dias.length}, minmax(0, 1fr))`), bounded by `HORAS_DO_DIA` inside a `max-h-[65vh] overflow-y-auto` container.
- `[grade-horaria.tsx:eventosDoDia]` — Matches events to day columns strictly by start date (`toDateInputValue(evento.dataInicio) === alvo`).
- `[grade-horaria.tsx:eventosDiaInteiro]` — Renders the all-day row only when `temEventoDiaInteiro` is true; timed events bucket into hourly rows via `!e.diaInteiro && horaDoDia(e.dataInicio) === hora` (`[grade-horaria.tsx:eventosDaHora]`).

## Side Effects
- `[calendario-nav.tsx:CalendarioNav]` — Reads URL search params via `useSearchParams()` and current wall-clock time via `new Date()` when clicking `"Hoje"`.
- `[calendario-nav.tsx:irPara]` — Performs client-side navigation via ``router.push(`/agenda?${params.toString()}`)``.
- `[calendario-mes.tsx:CalendarioMes]` — Calls `e.stopPropagation()` on the overflow `"+N mais"` button and `PopoverContent`.
- `[evento-chip.tsx:EventoChip]` — Mutates local dialog state via `useState(false)` and calls `e.stopPropagation()` on chip clicks and `DialogContent` click/pointerDown events.

## Verification
- Run: `npm test`
