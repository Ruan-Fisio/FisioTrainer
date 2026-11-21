# novo (`evolucoes/novo`)

## Overview
Next.js App Router server page (`/pacientes/[id]/evolucoes/novo`) for creating a new clinical evolution record for a specific patient. It verifies that the target patient exists via Prisma and renders `EvolucaoForm` in create mode bound to `createEvolucao`.

## Interface
- `[page.tsx:NovaEvolucaoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:NovaEvolucaoPage]` Calls `notFound()` when `prisma.paciente.findUnique({ where: { id }, select: { nome: true } })` returns null (`if (!paciente) notFound()`). No local session/role or soft-delete guard is declared in this file.

## Side Effects
- `[page.tsx:NovaEvolucaoPage]` Server-side Prisma read: `prisma.paciente.findUnique({ where: { id }, select: { nome: true } })`.
- `[page.tsx:NovaEvolucaoPage]` Binds server action `createEvolucao` (`@/actions/evolucoes`) via `createEvolucao.bind(null, id)` and passes it as `action` to `EvolucaoForm` (`mode="create"`, `pacienteId={id}`).

## Verification
- Run: `npm test`
