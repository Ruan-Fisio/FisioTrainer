# editar (`[execucaoId]/editar`)

## Overview
Next.js App Router server page (`/pacientes/[id]/exames/[execucaoId]/editar`) for editing an existing patient exam execution (`AVALIACAO` or follow-up `retorno`). It concurrently loads the execution, movement options, and attached images, enforces patient ownership, and renders `ExameExecucaoForm` bound to `updateExecucao`.

## Interface
- `[page.tsx:EditarExecucaoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; execucaoId: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:EditarExecucaoPage]` Calls `notFound()` if `!execucao || execucao.pacienteId !== id`, enforcing execution existence and ownership by the route patient `id`.
- `[page.tsx:EditarExecucaoPage]` Pins the form exam via `fixedExameId={execucao.exame.id}` and `exames={[execucao.exame]}`, branches labels on `execucao.tipo === "AVALIACAO"`, and sets `cancelHref` to `/pacientes/${id}/exames/${execucaoId}`. No local session/role guard or `redirect()` is declared in this file.

## Side Effects
- `[page.tsx:EditarExecucaoPage]` Concurrently loads server data via `Promise.all([getExecucao(execucaoId), listAllMovimentos(), listarImagensExecucao(execucaoId)])` (`@/actions/exame-execucoes`, `@/actions/movimentos`, `@/actions/exame-imagens`).
- `[page.tsx:EditarExecucaoPage]` Binds server action `updateExecucao.bind(null, execucaoId, id)` (`@/actions/exame-execucoes`) and passes it as `action` to `ExameExecucaoForm` along with `defaultValores`, `execucaoId`, and `imagensIniciais`.

## Verification
- Run: `npm test`
