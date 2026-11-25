# [execucaoId] (`exames/[execucaoId]`)

## Overview
Next.js App Router server page (`/pacientes/[id]/exames/[execucaoId]`) presenting the detail view of a patient's exam execution (`AVALIACAO` or `RETORNO`), including recorded values, attached images, quick comparison dialog, follow-up links, and action controls. Serves as the parent segment for comparison, edit, and follow-up creation routes.

## Interface
- `[page.tsx:ExecucaoDetailPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; execucaoId: string }> }`. No named exports (`metadata`, `dynamic`, etc.).
- Subdirectories:
  - [comparar](./comparar/README.md) - Server page (`CompararExecucaoPage`) rendering comparative reports and PDF export between an `AVALIACAO` and a selected `retorno`.
  - [editar](./editar/README.md) - Server page (`EditarExecucaoPage`) for editing an existing exam execution via `ExameExecucaoForm` and `updateExecucao`.
  - [retorno](./retorno/README.md) - Server page (`NovoRetornoPage`) for registering a follow-up (`retorno`) linked to an `AVALIACAO` via `createRetorno`.

## Invariants
- `[page.tsx:ExecucaoDetailPage]` Calls `notFound()` when `!execucao || execucao.pacienteId !== id`, enforcing execution existence and patient ownership against route param `id`.
- `[page.tsx:ExecucaoDetailPage]` Displays the follow-up creation link (`/pacientes/${id}/exames/${execucaoId}/retorno`) only when `execucao.tipo === "AVALIACAO"`.
- `[page.tsx:ExecucaoDetailPage]` Displays `ComparacaoRapidaDialog`, the comparison link (`/pacientes/${id}/exames/${execucaoId}/comparar`), and the follow-ups card list only when `execucao.tipo === "AVALIACAO" && execucao.retornos.length > 0`.
- `[page.tsx:ExecucaoDetailPage]` Displays the link back to the original evaluation (`/pacientes/${id}/exames/${execucao.avaliacao.id}`) only when `execucao.tipo === "RETORNO" && execucao.avaliacao`.
- `[page.tsx:ExecucaoDetailPage]` Always displays `ImprimirExecucaoButton` (individual PDF via `/api/execucoes/${execucaoId}/relatorio-individual`), for both `AVALIACAO` and `RETORNO`.

## Side Effects
- `[page.tsx:ExecucaoDetailPage]` Concurrently loads execution details and images on the server via `Promise.all([getExecucao(execucaoId), listarImagensExecucao(execucaoId)])` (`@/actions/exame-execucoes`, `@/actions/exame-imagens`).
- `[page.tsx:ExecucaoDetailPage]` Passes execution context into `ComparacaoRapidaDialog` (`avaliacaoId`, `avaliacaoData`, `retornos`), `ExecucaoDetailActions` (`id`, `pacienteId`, `tipo`), and `ExecucaoValores` (`execucao`, `imagens`).

## Verification
- Run: `npm test`
