# retorno (`[execucaoId]/retorno`)

## Overview
Next.js App Router server page (`/pacientes/[id]/exames/[execucaoId]/retorno`) for registering a new follow-up (`retorno`) exam execution linked to an existing `AVALIACAO` execution. It verifies the base evaluation, prepares shadow (`sombra`) or blanked goniometry initial values, and renders `ExameExecucaoForm` bound to `createRetorno`.

## Interface
- `[page.tsx:NovoRetornoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; execucaoId: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:NovoRetornoPage]` Calls `notFound()` when `!avaliacao || avaliacao.pacienteId !== id || avaliacao.tipo !== "AVALIACAO"`, enforcing existence, patient ownership, and base execution type `AVALIACAO`.
- `[page.tsx:valoresIniciaisRetorno]` For non-sombra exams (`!avaliacao.exame.sombra`), pre-populates `defaultValores` only from `avaliacao.valores` whose column `tipo === "GONIOMETRIA"`, resets each parsed entry's `grauAlcancado` to `""`, and omits entries that serialize to `"[]"`.
- `[page.tsx:NovoRetornoPage]` For sombra exams (`avaliacao.exame.sombra`), derives `defaultValores` via `montarValoresSombra(execucaoAnterior?.valores ?? [], colunasDoExame(avaliacao))` and passes `valoresSombra={defaultValores}`; otherwise passes `valoresSombra={undefined}`.
- `[page.tsx:NovoRetornoPage]` Locks `ExameExecucaoForm` to `avaliacao.exame` via `exames={[avaliacao.exame]}` and `fixedExameId={avaliacao.exame.id}`, setting `cancelHref` to `/pacientes/${id}/exames/${execucaoId}`.

## Side Effects
- `[page.tsx:NovoRetornoPage]` Loads the base evaluation via `getExecucao(execucaoId)` (`@/actions/exame-execucoes`).
- `[page.tsx:NovoRetornoPage]` Concurrently runs `Promise.all` to conditionally call `getExecucaoAnteriorParaRetorno(id, avaliacao.exame.id)` (when `avaliacao.exame.sombra` is truthy) and `listAllMovimentos()` (`@/actions/movimentos`).
- `[page.tsx:NovoRetornoPage]` Binds server action `createRetorno.bind(null, id, execucaoId)` (`@/actions/exame-execucoes`) and passes it as `action` to `ExameExecucaoForm`.

## Verification
- Run: `npm test`
