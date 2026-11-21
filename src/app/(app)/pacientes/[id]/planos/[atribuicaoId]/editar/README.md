# editar (`[atribuicaoId]/editar`)

## Overview
Next.js App Router server page (`/pacientes/[id]/planos/[atribuicaoId]/editar`) for editing an existing patient plan assignment. It validates assignment existence and patient ownership, concurrently loads available plans, recurring schedule options/lines, and card installment fee configuration, and renders `PlanoAtribuicaoForm` in edit mode.

## Interface
- `[page.tsx:EditarAtribuicaoPlanoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; atribuicaoId: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:EditarAtribuicaoPlanoPage]` Calls `notFound()` when `!atribuicao || atribuicao.pacienteId !== id`, enforcing both assignment existence and ownership by the route patient `id`.
- `[page.tsx:EditarAtribuicaoPlanoPage]` Derives `vencimentos` from `atribuicao.cobrancas` filtered by `c.status === "PENDENTE"`, falling back to all `atribuicao.cobrancas` when no pending charges exist, formatted via `toDateInputValue(c.vencimento)`.
- `[page.tsx:EditarAtribuicaoPlanoPage]` Normalizes `defaultValues` with `planoId: atribuicao.planoId ?? ""`, `descontoTipo: atribuicao.desconto > 0 ? "VALOR" : "NENHUM"`, and `descontoValor: atribuicao.desconto > 0 ? atribuicao.desconto : undefined`.

## Side Effects
- `[page.tsx:EditarAtribuicaoPlanoPage]` Loads the plan assignment on the server via `getPlanoAtribuicao(atribuicaoId)` (`@/actions/plano-atribuicoes`).
- `[page.tsx:EditarAtribuicaoPlanoPage]` Concurrently loads form dependencies via `Promise.all([listPlanosDisponiveis(), getGradeRecorrenteOpcoes(), getLinhasGradeRecorrente(atribuicaoId), getTaxaParcelamentoCartao()])`.
- `[page.tsx:EditarAtribuicaoPlanoPage]` Binds server action `updatePlanoAtribuicao.bind(null, atribuicaoId, id)` and passes it as `action` to `PlanoAtribuicaoForm` (`mode="edit"`).

## Verification
- Run: `npm test`
