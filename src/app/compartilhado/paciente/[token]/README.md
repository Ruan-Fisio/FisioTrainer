# Shared Patient Portal (`[token]`)

## Overview
Public token-scoped patient portal layout and tabbed dashboard page wrapping child routes (`documentos`, `exames`, `financeiro`). `PortalPacienteLayout` renders the branded FisioTrainer shell reused across portal routes, while `PortalPacientePage` resolves the patient from `token` and streams eight Suspense-wrapped portal sections (evaluations, patient-uploaded attachments, clinical evolutions, documents, active workouts, plans, scheduling, and billing).

## Interface
- `[layout.tsx:PortalPacienteLayout]` — Default export layout component accepting `{ children: ReactNode }`; no `metadata`, `generateMetadata`, or route segment config exports.
- `[page.tsx:PortalPacientePage]` — Default export async Server Component accepting `{ params: Promise<{ token: string }> }`; no `searchParams`, `metadata`, `generateMetadata`, or route segment config exports.
- Subdirectories:
  - `documentos`: [./documentos/README.md](./documentos/README.md) - Token-scoped patient document inline PDF endpoint (`[id]/pdf`).
  - `exames`: [./exames/README.md](./exames/README.md) - Token-scoped exam execution detail page (`[execucaoId]`).
  - `financeiro`: [./financeiro/README.md](./financeiro/README.md) - Token-scoped plan and standalone charge detail page (`[planoId]`).

## Invariants
- `[page.tsx:PortalPacientePage]` Resolves `{ pacienteId, paciente }` from awaited `params.token` via `resolverPacientePorToken(token)` before rendering, relying on `resolverPacientePorToken` for invalid-token handling (no direct `notFound()` call in this file).
- `[page.tsx:PacienteTabs]` Renders 8 fixed tabs (`avaliacoes`, `anexos`, `evolucoes`, `documentos`, `treinos`, `planos`, `agendamentos`, `financeiro`) with `defaultValue="avaliacoes"` and no URL tab parameter validation.
- `[page.tsx:AvaliacoesLoader]` Runs `getAvaliacoesByPaciente(pacienteId)` strictly inside `comAcessoPortal(pacienteId, ...)`.
- `[page.tsx:EvolucoesLoader]` Runs `getEvolucoesByPaciente(pacienteId)` strictly inside `comAcessoPortal(pacienteId, ...)`.
- `[page.tsx:PlanosLoader]` Runs `listPlanoAtribuicoesByPaciente(pacienteId)` inside `comAcessoPortal(pacienteId, ...)` and renders `PlanoAtribuicoesList` read-only with `showActions={false}`.
- `[page.tsx:FinanceiroLoader]` Runs `listPlanoAtribuicoesByPaciente(pacienteId)` and `getCobrancasByPaciente(pacienteId)` inside `comAcessoPortal(pacienteId, ...)`.
- `[page.tsx:AgendamentosLoader]` Runs `materializarGradesPaciente(pacienteId)` and `getConsumoPlanoPaciente(pacienteId, ano, mes)` inside `comAcessoPortal(pacienteId, ...)`, unconditionally zeroes rescheduling credits (`creditos: { max: 0, usados: 0, disponiveis: 0 }`) on `resumoInicial`, binds all 6 portal scheduling actions to `token`, and mounts `PacienteAgendamentosTab` with `somenteLeitura`.
- `[page.tsx:AnexosLoader]` Restricts attachment listing to `{ origem: "PACIENTE" }`, binds upload/confirm/remove portal actions to `token`, and enables patient self-deletion via `permitirExcluir`.
- `[page.tsx:TreinosLoader]` Queries only active workouts (`where: { pacienteId, ativo: true }`), renders an empty-state `Card` when `treinos.length === 0`, and converts `ex.carga` to `Number(ex.carga)` or `null` before passing to `TreinoCompartilhadoView`.

## Side Effects
- `[layout.tsx:PortalPacienteLayout]` Renders `<Image src="/logo.png" priority />` and wraps `{children}` across the portal root and its child route segments.
- `[page.tsx:PortalPacientePage]` Calls `resolverPacientePorToken(token)` and mounts 8 `<Suspense fallback={<TableSkeleton />}>` loader boundaries inside `PacienteTabs`.
- `[page.tsx:AvaliacoesLoader]` Invokes `comAcessoPortal` -> `getAvaliacoesByPaciente(pacienteId)` and mounts `AvaliacoesPublicas` with `token`.
- `[page.tsx:AnexosLoader]` Invokes `listarAnexosComUrls(pacienteId, { origem: "PACIENTE" })` and mounts `AnexosPaciente` wired to token-bound Server Actions `solicitarUploadAnexoPortal`, `confirmarAnexoPortal`, and `removerAnexoPortal`.
- `[page.tsx:EvolucoesLoader]` Invokes `comAcessoPortal` -> `getEvolucoesByPaciente(pacienteId)` and mounts `EvolucoesPublicas`.
- `[page.tsx:DocumentosLoader]` Invokes `listarDocumentosDoPaciente(pacienteId)` and mounts `DocumentosPublicos` with `token`.
- `[page.tsx:TreinosLoader]` Queries `prisma.treino.findMany` (ordered by `createdAt: "desc"`, nested `dias` and `exercicios` ordered by `ordem: "asc"`, selecting `exercicio` `{ id, name, links }`) and mounts `TreinoCompartilhadoView` when non-empty.
- `[page.tsx:PlanosLoader]` Invokes `comAcessoPortal` -> `listPlanoAtribuicoesByPaciente(pacienteId)` and mounts `PlanoAtribuicoesList`.
- `[page.tsx:AgendamentosLoader]` Invokes `anoMesBrasilia()`, triggers recurring schedule materialization via `comAcessoPortal` -> `materializarGradesPaciente(pacienteId)`, fetches `getConsumoPlanoPaciente(pacienteId, ano, mes)`, and mounts `AcoesPortalProvider` (binding `portalGetConsumoPlanoPaciente`, `portalDesmarcarAgendamento`, `portalGetDadosAgendamentoAssistido`, `portalGetDisponibilidadeMesAssistido`, `portalGetDisponibilidadeHorarios`, and `portalCriarAgendamentoAssistido` to `token`) around `PacienteAgendamentosTab`.
- `[page.tsx:FinanceiroLoader]` Invokes `comAcessoPortal` -> `Promise.all([listPlanoAtribuicoesByPaciente(pacienteId), getCobrancasByPaciente(pacienteId)])` and mounts `PlanosFinanceiroPublico` with `token`.

## Verification
- Run: `npm test`
