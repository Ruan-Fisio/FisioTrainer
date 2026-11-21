# [id] (`pacientes/[id]`)

## Overview
Next.js App Router patient detail hub and shared route guard (`/pacientes/[id]`). `layout.tsx` enforces that the target patient exists and is active (`PACIENTE_ATIVO`) across `/pacientes/[id]` and all nested patient sub-routes, while `page.tsx` renders the patient profile header and an 8-tab Suspense-streamed clinical/administrative workspace (`avaliacoes`, `imagens`, `evolucoes`, `documentos`, `treinos`, `planos`, `agendamentos`, `financeiro`).

## Interface
- `[layout.tsx:PacienteLayout]` Default-exported async Server Component accepting `{ children: ReactNode; params: Promise<{ id: string }> }`, wrapping `/pacientes/[id]` and all child segments. No named exports (`metadata`, `dynamic`, etc.).
- `[page.tsx:PacienteDetailPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string }> }`, rendering the patient header (`CompartilharAcessoDialog`, `HistoricoClinicoDialog`, edit link `/pacientes/${id}/editar`) and `PacienteTabs` (`defaultValue="avaliacoes"`) across 8 Suspense-wrapped tabs. No named exports (`metadata`, `dynamic`, etc.).
- Subdirectories:
  - [cobrancas](./cobrancas/README.md) - Route group for creating and editing patient charges (`./cobrancas/novo`, `./cobrancas/[cobrancaId]/editar`).
  - [documentos](./documentos/README.md) - Route group for selecting templates, creating, editing, and exporting patient documents (`./documentos/novo`, `./documentos/[docId]`).
  - [editar](./editar/README.md) - Server page (`EditarPacientePage`) for editing the patient profile via `PacienteForm` and `updatePaciente`.
  - [evolucoes](./evolucoes/README.md) - Route group for creating, viewing, and editing clinical evolutions (`./evolucoes/novo`, `./evolucoes/[evolucaoId]`, `./evolucoes/[evolucaoId]/editar`).
  - [exames](./exames/README.md) - Route group for creating evaluations, viewing executions, recording follow-ups, editing, and comparing exam results (`./exames/novo`, `./exames/[execucaoId]`).
  - [planos](./planos/README.md) - Route group for assigning and editing patient plans (`./planos/novo`, `./planos/[atribuicaoId]/editar`).
  - [treinos](./treinos/README.md) - Server page (`PacienteTreinosPage`) listing and assigning patient workouts, with child `./treinos/[treinoId]/editar`.

## Invariants
- `[layout.tsx:PacienteLayout]` Enforces active (non-deleted) patient existence across `/pacientes/[id]` and all child routes via `prisma.paciente.findFirst({ where: { id, ...PACIENTE_ATIVO }, select: { id: true } })`, invoking `notFound()` if no matching active record exists.
- `[page.tsx:PacienteDetailPage]` Invokes `notFound()` if `prisma.paciente.findUnique({ where: { id } })` returns null.
- `[page.tsx:PacienteDetailPage]` Degrades attachment fetch failures to an empty list via `listarAnexosPaciente(id).catch(() => [])`.
- `[page.tsx:PlanosLoader]` Passes `pacienteContrato={paciente ?? undefined}` to `PlanoAtribuicoesList` when `prisma.paciente.findUnique` returns null.
- `[page.tsx:FinanceiroLoader]` Guards `prisma.user.findUnique` behind `session?.user?.id`, falling back to `cnpjPix={profissional?.cpfCnpj ?? null}`. Neither `layout.tsx` nor `page.tsx` performs an explicit auth redirect or role/ownership check locally.

## Side Effects
- `[layout.tsx:PacienteLayout]` Server-side Prisma read: `prisma.paciente.findFirst({ where: { id, ...PACIENTE_ATIVO }, select: { id: true } })`.
- `[page.tsx:PacienteDetailPage]` Server-side Prisma read `prisma.paciente.findUnique({ where: { id } })` and attachment load `listarAnexosPaciente(id)` (`@/actions/paciente-anexos`).
- `[page.tsx:TreinosListLoader]` Suspense server load: `listTreinosPaciente(pacienteId)` (`@/actions/treinos-paciente`).
- `[page.tsx:AvaliacoesListLoader]` Suspense server load: `getAvaliacoesByPaciente(pacienteId)` (`@/actions/exame-execucoes`).
- `[page.tsx:ImagensLoader]` Suspense server load: `listarSeriesImagensPaciente(pacienteId)` (`@/actions/exame-imagens`).
- `[page.tsx:DocumentosLoader]` Suspense server load: `listarDocumentosPaciente(pacienteId)` (`@/actions/documentos-paciente`).
- `[page.tsx:EvolucoesListLoader]` Suspense server load: `getEvolucoesByPaciente(pacienteId)` (`@/actions/evolucoes`).
- `[page.tsx:AgendamentosTabLoader]` Suspense server write/materialization on render: awaits `materializarGradesPaciente(pacienteId)` (`@/actions/grade-recorrente`), then runs `Promise.all([getConsumoPlanoPaciente(pacienteId, ano, mes), getGradeRecorrenteContexto(pacienteId), listAgendamentosServicoPaciente(pacienteId, ano, mes), listAllServicos()])` using `{ ano, mes }` from `anoMesBrasilia()`.
- `[page.tsx:PlanosLoader]` Suspense parallel load: `listPlanoAtribuicoesByPaciente(pacienteId)` (`@/actions/plano-atribuicoes`) and `prisma.paciente.findUnique({ where: { id: pacienteId }, select: { nome: true, contato: true, cpf: true } })`.
- `[page.tsx:FinanceiroLoader]` Suspense session and data load: `auth()`, `listPlanoAtribuicoesByPaciente(pacienteId)`, `getCobrancasByPaciente(pacienteId)` (`@/actions/cobrancas`), and conditionally `prisma.user.findUnique({ where: { id: session.user.id }, select: { cpfCnpj: true } })`.
- `[page.tsx:PacienteDetailPage]` Hydrates interactive client components (`CompartilharAcessoDialog`, `HistoricoClinicoDialog`, `PacienteTabs`, `AvaliacoesList`, `PacienteImagensTab`, `EvolucoesList`, `PacienteDocumentosTab`, `AtribuirTreinoButton`, `TreinosPacienteList`, `PlanoAtribuicoesList`, `AgendamentoAssistidoDialog`, `PacienteAgendamentosTab`, `PacienteCobrancasList`).

## Verification
- Run: `npm test`
