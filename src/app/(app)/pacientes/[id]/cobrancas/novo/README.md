# novo (`cobrancas/novo`)

## Overview
Next.js App Router server page (`/pacientes/[id]/cobrancas/novo`) for creating a standalone charge (`cobrança avulsa`) for a specific patient. It verifies that the target patient exists via Prisma and renders `CobrancaForm` in create mode bound to `createCobranca`.

## Interface
- `[page.tsx:NovaCobrancaPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:NovaCobrancaPage]` Calls `notFound()` when `prisma.paciente.findUnique({ where: { id }, select: { nome: true } })` returns null (`if (!paciente) notFound()`).
- `[page.tsx:NovaCobrancaPage]` Initializes `CobrancaForm` `defaultValues` with `planoNome: ""`, `valor: ""`, `vencimento: ""`, `status: "PENDENTE"`, and `observacao: ""`. No local session/role or soft-delete guard is declared in this file.

## Side Effects
- `[page.tsx:NovaCobrancaPage]` Server-side Prisma read: `prisma.paciente.findUnique({ where: { id }, select: { nome: true } })`.
- `[page.tsx:NovaCobrancaPage]` Binds server action `createCobranca` (`@/actions/cobrancas`) via `createCobranca.bind(null, id)` and passes it as `action` to `CobrancaForm` (`mode="create"`, `pacienteId={id}`).

## Verification
- Run: `npm test`
