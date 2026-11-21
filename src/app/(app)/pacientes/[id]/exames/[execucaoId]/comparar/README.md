# comparar (`[execucaoId]/comparar`)

## Overview
Next.js App Router server page (`/pacientes/[id]/exames/[execucaoId]/comparar`) displaying a comparative report between a patient's initial `AVALIACAO` exam execution and a selected follow-up (`retorno`). It renders patient and clinical summary tables, per-section ideal-value comparison tables, consolidated bar charts, a follow-up selector, and PDF export controls.

## Interface
- `[page.tsx:CompararExecucaoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; execucaoId: string }>; searchParams: Promise<{ retornoId?: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:CompararExecucaoPage]` Calls `notFound()` if `!avaliacao`, `avaliacao.pacienteId !== id`, or `avaliacao.tipo !== "AVALIACAO"`.
- `[page.tsx:CompararExecucaoPage]` When `avaliacao.retornos.length === 0`, skips comparison loading and renders an empty-state screen linking back to `/pacientes/${id}/exames/${execucaoId}`.
- `[page.tsx:CompararExecucaoPage]` Resolves `retornoSelecionadoId` via `retornoId ?? avaliacao.retornos[0].id` and calls `notFound()` if `getComparativo(execucaoId, retornoSelecionadoId)` returns a falsy value. No local session/role guard is declared in this file.

## Side Effects
- `[page.tsx:CompararExecucaoPage]` Loads server data via `getExecucao(execucaoId)` and `getComparativo(execucaoId, retornoSelecionadoId)` (`@/actions/exame-execucoes`).
- `[page.tsx:CompararExecucaoPage]` Passes selection and report props to `RetornoSelect` (`retornos`, `value`), `BaixarPdfButton` (`execucaoId`, `retornoId`), and `RelatorioBarChart` (`titulo`, `itens`, `sufixo`).

## Verification
- Run: `npm test`
