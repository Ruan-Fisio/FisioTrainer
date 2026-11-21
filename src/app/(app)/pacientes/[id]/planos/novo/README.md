# novo (`planos/novo`)

## Overview
Next.js App Router server page (`/pacientes/[id]/planos/novo`) for assigning a catalog plan to a patient. It verifies patient existence via Prisma, concurrently loads available plans, recurring schedule options, and card installment fee configuration, and renders `PlanoAtribuicaoForm` in create mode.

## Interface
- `[page.tsx:NovaAtribuicaoPlanoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:NovaAtribuicaoPlanoPage]` Calls `notFound()` when `prisma.paciente.findUnique({ where: { id }, select: { nome: true } })` returns null. No local session/role or soft-delete guard is declared in this file.

## Side Effects
- `[page.tsx:NovaAtribuicaoPlanoPage]` Server-side Prisma read: `prisma.paciente.findUnique({ where: { id }, select: { nome: true } })`.
- `[page.tsx:NovaAtribuicaoPlanoPage]` Concurrently loads server dependencies via `Promise.all([listPlanosDisponiveis(), getGradeRecorrenteOpcoes(), getTaxaParcelamentoCartao()])` (`@/actions/planos`, `@/actions/grade-recorrente`, `@/actions/configuracao-financeira`).
- `[page.tsx:NovaAtribuicaoPlanoPage]` Binds server action `createPlanoAtribuicao.bind(null, id)` (`@/actions/plano-atribuicoes`) and passes it as `action` to `PlanoAtribuicaoForm` (`mode="create"`, `pacienteId={id}`).

## Verification
- Run: `npm test`
