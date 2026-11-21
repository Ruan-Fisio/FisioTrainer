# Shared Patient Exam Execution (`exames/[execucaoId]`)

## Overview
Async Server Component page in the shared patient portal that validates the portal token, loads a single exam execution inside `comAcessoPortal`, verifies patient ownership, and renders `ExecucaoValores` alongside navigation links to evaluations and linked `AVALIACAO`/`RETORNO` executions.

## Interface
- `[page.tsx:ExecucaoPublicaPage]` — Default export async Server Component accepting `{ params: Promise<{ token: string; execucaoId: string }> }`; no `metadata`/`generateMetadata` or route segment config exports are defined.

## Invariants
- `[page.tsx:resolverPacientePorToken]` Validates and resolves `{ pacienteId }` from `params.token` via `resolverPacientePorToken(token)`.
- `[page.tsx:comAcessoPortal]` Executes `getExecucao(execucaoId)` inside `comAcessoPortal(pacienteId, ...)`.
- `[page.tsx:notFound]` Invokes `notFound()` when `!execucao || execucao.pacienteId !== pacienteId`, enforcing both existence and patient ownership.
- `[page.tsx:ExecucaoPublicaPage]` Renders the `Retornos` list only when `execucao.tipo === "AVALIACAO" && execucao.retornos.length > 0`, and renders the link to the original evaluation only when `execucao.tipo === "RETORNO" && execucao.avaliacao`.

## Side Effects
- `[page.tsx:resolverPacientePorToken]` Resolves the shared portal patient via `resolverPacientePorToken(token)` from `@/lib/acesso-compartilhado`.
- `[page.tsx:comAcessoPortal]` Scopes execution under portal session context via `comAcessoPortal(pacienteId, ...)` from `@/lib/sessao`.
- `[page.tsx:getExecucao]` Fetches exam execution data via `getExecucao(execucaoId)` from `@/actions/exame-execucoes`.
- `[page.tsx:Link]` Renders internal Next.js links to `/compartilhado/paciente/${token}?tab=avaliacoes`, `/compartilhado/paciente/${token}/exames/${retorno.id}`, and `/compartilhado/paciente/${token}/exames/${execucao.avaliacao.id}`.

## Verification
- Run: `npm test`
