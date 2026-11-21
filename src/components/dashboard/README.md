# dashboard

## Overview
Dashboard presentation and interactive widgets: an upcoming appointments summary card with local filtering and attendance status mutations (`AgendaResumoCard`), a financial analytics view with Recharts visualizations, rankings, and overdue charges (`AnaliseFinanceira`), a reusable KPI grid (`KpiGrid`), and a monthly plus 12-month revenue-vs-expenses comparison card (`ReceitaDespesas`).

## Interface
- `[agenda-resumo-card.tsx:AgendaResumoCard]` — Client Component (`{ agendamentosIniciais, contagens, profissionais, salas, servicos }`) for viewing/filtering upcoming appointments by period (`"dia" | "semana" | "mes"`), marking attendance (`"COMPARECEU" | "FALTOU"`), or rescheduling.
- `[analise-financeira.tsx:AnaliseFinanceira]` — Client Component (`{ analise, atrasadas, comparativo }`) composing KPI cards, `ReceitaDespesas`, monthly revenue area chart, modality pie and stacked-bar charts, upcoming receivables, top plans/patients rankings, and overdue charges.
- `[kpi-grid.tsx:Kpi]` — Exported type `{ label: string; value: string; hint?: string; icon: LucideIcon; tone?: "default" | "danger" }`.
- `[kpi-grid.tsx:KpiGrid]` — Component (`{ kpis: Kpi[]; className?: string }`) rendering a responsive grid of KPI cards.
- `[receita-despesas.tsx:ReceitaDespesas]` — Client Component (`{ comparativo: ComparativoReceitaDespesa }`) rendering current-month balance breakdown, 12-month grouped bar chart, and collapsible monthly table.

## Invariants
- `[agenda-resumo-card.tsx:PERIODOS]` — Period options are restricted to `"dia"`, `"semana"`, and `"mes"` (default `"dia"`); `[agenda-resumo-card.tsx:mudarPeriodo]` returns early when `novo === periodo`.
- `[agenda-resumo-card.tsx:FILTROS_VAZIOS]` — Filter selections (`profissionalIds`, `modalidades`, `salaIds`, `servicoIds`, `planoHibrido`) live only in local component state (`[agenda-resumo-card.tsx:FiltroLocal]`), not URL search params.
- `[agenda-resumo-card.tsx:AgendaResumoCard]` — Date headings render only when `periodo !== "dia"`; status badges render only when `a.status !== "AGENDADO"`; `Compareceu`, `Faltou`, and `RemarcarDialog` render only when `a.status === "AGENDADO"`; participant name defaults to `a.pacientes[0]?.nome ?? a.titulo` (`[agenda-resumo-card.tsx:nomeParticipante]`).
- `[agenda-resumo-card.tsx:confirmarStatus]` — Allows only `StatusMarcavel` (`"COMPARECEU" | "FALTOU"`) and exits early when `confirmacao` is `null`; pending transitions disable controls and apply `pointer-events-none opacity-60`.
- `[analise-financeira.tsx:YAxisHint]` — Returns `null` when `Math.max(0, ...data) === 0`; `[analise-financeira.tsx:eixoMoeda]` returns `""` for falsy values.
- `[analise-financeira.tsx:ModalidadeEvolucaoCard]` — Iterates `CATEGORIAS_RECEITA` under `stackId="receita"` and rounds top bar corners (`[4, 4, 0, 0]`) only on the last category.
- `[analise-financeira.tsx:AReceberCard]` — Renders `<Link href="/cobrancas">` only when `m.valor > 0`, else `"—"`; `[analise-financeira.tsx:RankingCard]` clamps the bar normalization denominator to `Math.max(1, ...itens.map((i) => i.valor))`.
- `[kpi-grid.tsx:KpiGrid]` — Uses `kpi.label` as React `key` (requiring unique labels), applies `text-destructive` when `kpi.tone === "danger"`, and renders `hint` only when truthy.
- `[receita-despesas.tsx:ReceitaDespesas]` — Displays `"Ainda sem receita neste mês."` when `mes.comprometimentoPct === null`; appends the tooltip `Saldo` row at `index === 1` (assuming 2 series: `receita`, `despesa`); iterates a shallow copy `[...porMes].reverse()` without mutating `porMes`; highlights negative highlighted values (`destaque && valor < 0`) and negative table balances (`m.saldo < 0`) with `text-destructive` (`[receita-despesas.tsx:Linha]`).

## Side Effects
- `[agenda-resumo-card.tsx:recarregar]` — Calls server actions `getProximosAgendamentos(novoPeriodo, novosFiltros)` and `getContagensAgenda(novosFiltros)` in parallel via `Promise.all` inside `startTransition`.
- `[agenda-resumo-card.tsx:confirmarStatus]` — Calls server action `atualizarStatusAgendamento(agendamento.id, status)` inside `startTransition`, updates local `agendamentos`, clears `confirmacao`, and emits `toast.success`.
- `[agenda-resumo-card.tsx:AgendaResumoCard]` — Links to `/agenda` and embeds `RemarcarDialog`.
- `[analise-financeira.tsx:AnaliseFinanceira]` — Links to `/pacientes/${p.pacienteId}`, `/cobrancas`, and `/pacientes/${cobranca.pacienteId}`.
- `[receita-despesas.tsx:ReceitaDespesas]` — Links to `/dashboard?tab=despesas`.

## Verification
- Run: `npm test`
