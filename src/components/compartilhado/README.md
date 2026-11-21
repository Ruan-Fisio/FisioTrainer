# compartilhado

## Overview
Shared patient-portal UI package providing a React Context (`AcoesPortalProvider` / `useAcoesAgendamento`) to inject token-scoped scheduling actions (defaulting to clinic-session actions) and four read-only public views for shared patient links: evaluations (`AvaliacoesPublicas`), documents with PDF links (`DocumentosPublicos`), collapsible clinical evolutions (`EvolucoesPublicas`), and plan/ad-hoc financial summaries (`PlanosFinanceiroPublico`).

## Interface
- `[acoes-portal.tsx:AcoesAgendamento]` — Type alias (`typeof ACOES_CLINICA`) bundling `getConsumoPlanoPaciente`, `desmarcarAgendamentoPeloPaciente`, `getDadosAgendamentoAssistido`, `getDisponibilidadeMesAssistido`, `getDisponibilidadeHorarios`, and `criarAgendamentoAssistido`.
- `[acoes-portal.tsx:AcoesPortalProvider]` — Client Component (`{ acoes: AcoesAgendamento; children: ReactNode }`) overriding scheduling actions in React Context.
- `[acoes-portal.tsx:useAcoesAgendamento]` — Client hook returning the current `AcoesAgendamento` from `Contexto`.
- `[avaliacoes-publicas.tsx:AvaliacoesPublicas]` — Component (`{ token: string; avaliacoes: Avaliacao[] }`) rendering tabbed evaluation lists linking to shared exam detail pages.
- `[documentos-publicos.tsx:DocumentosPublicos]` — Component (`{ token: string; documentos: DocumentoListado[] }`) rendering read-only document cards linking to PDF endpoints.
- `[evolucoes-publicas.tsx:EvolucoesPublicas]` — Client Component (`{ evolucoes: Evolucao[] }`) rendering expandable clinical evolution cards.
- `[planos-financeiro-publico.tsx:PlanosFinanceiroPublico]` — Component (`{ token: string; atribuicoes: Atribuicao[]; cobrancas: Cobranca[] }`) rendering plan-grouped and standalone billing summary cards.

## Invariants
- `[acoes-portal.tsx:Contexto]` — Defaults to `ACOES_CLINICA` from `@/actions/agendamentos`; consumers outside `AcoesPortalProvider` receive clinic-session actions.
- `[avaliacoes-publicas.tsx:AvaliacoesPublicas]` — Defaults active tab to `"FISIOTERAPIA"` and partitions `avaliacoes` strictly by `a.exame.tipo === "FISIOTERAPIA"` and `"EDUCACAO_FISICA"`.
- `[avaliacoes-publicas.tsx:Lista]` — Renders an empty-state card when `avaliacoes.length === 0`; links evaluations to `/compartilhado/paciente/${token}/exames/${avaliacao.id}` and returns (when `avaliacao.retornos.length > 0`) to `/compartilhado/paciente/${token}/exames/${retorno.id}`.
- `[documentos-publicos.tsx:DocumentosPublicos]` — Renders an empty-state card when `documentos.length === 0`; links each document to `/compartilhado/paciente/${token}/documentos/${doc.id}/pdf` with `target="_blank"` and `rel="noopener"`.
- `[evolucoes-publicas.tsx:EvolucoesPublicas]` — Renders an empty-state card when `evolucoes.length === 0`; displays `TEXTO` (`hdp`, `hda`), `VITAIS` (`pa`, `fc`, `spo2`, `fr`, `temperatura`), `auscultaPulmonar`, and `FINAL` (`evolucao`, `conduta`) inside a `Collapsible` keyed by `evolucao.id`; missing values fall back to `"—"` (`[evolucoes-publicas.tsx:Campo]`).
- `[planos-financeiro-publico.tsx:PlanosFinanceiroPublico]` — Joins `cobrancas` to `atribuicoes` via `c.planoAtribuicaoId === a.id`, omits attributions with zero charges, collects standalone charges where `!c.planoAtribuicaoId`, and renders an empty-state card when both groups and standalone charges are empty; counts paid items strictly by `c.status === "PAGO"`.
- `[planos-financeiro-publico.tsx:statusAtribuicaoLabels]` — Maps `"ATIVO"`, `"CANCELADO"`, `"CONCLUIDO"` with raw fallback, using `Badge` variant `"secondary"` for `"ATIVO"` and `"outline"` otherwise; links plan groups to `/compartilhado/paciente/${token}/financeiro/${atribuicao.id}` and standalone charges to `/compartilhado/paciente/${token}/financeiro/avulsas`.

## Side Effects
- None

## Verification
- Run: `npm test`
