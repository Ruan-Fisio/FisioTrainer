# editar (`[cobrancaId]/editar`)

## Overview
Next.js App Router server page (`/pacientes/[id]/cobrancas/[cobrancaId]/editar`) for editing an existing charge belonging to a specific patient. It loads the charge on the server, verifies record existence and patient ownership, and renders `CobrancaForm` in edit mode wired to `updateCobranca`.

## Interface
- `[page.tsx:EditarCobrancaPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; cobrancaId: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:EditarCobrancaPage]` Calls `notFound()` if `!cobranca || cobranca.pacienteId !== id`, enforcing both charge existence and ownership by the route patient `id`.
- `[page.tsx:EditarCobrancaPage]` Formats `defaultValues.valor` from `(cobranca.valorBase ?? cobranca.valor).toFixed(2).replace(".", ",")`, converts `vencimento` with `toDateInputValue(cobranca.vencimento)`, and normalizes nullish `observacao` to `""`.

## Side Effects
- `[page.tsx:EditarCobrancaPage]` Loads charge data on the server via `await getCobranca(cobrancaId)` (`@/actions/cobrancas`).
- `[page.tsx:EditarCobrancaPage]` Binds the `updateCobranca` server action (`updateCobranca.bind(null, cobrancaId, id)`) and passes it as `action` to `CobrancaForm` (`mode="edit"`, `pacienteId={id}`).

## Verification
- Run: `npm test`
