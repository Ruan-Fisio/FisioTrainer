# editar (`[evolucaoId]/editar`)

## Overview
Next.js App Router server page (`/pacientes/[id]/evolucoes/[evolucaoId]/editar`) for editing a patient's clinical evolution record (`Evolucao`). It loads the record by `evolucaoId`, verifies existence and patient ownership, and renders `EvolucaoForm` in edit mode wired to `updateEvolucao`.

## Interface
- `[page.tsx:EditarEvolucaoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; evolucaoId: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:EditarEvolucaoPage]` Enforces record existence and patient ownership via `if (!evolucao || evolucao.pacienteId !== id) notFound()`. No local session/role or soft-delete guard is declared in this file.
- `[page.tsx:EditarEvolucaoPage]` Normalizes nullable `evolucao.auscultaPulmonar` to `""` (`evolucao.auscultaPulmonar ?? ""`) in `EvolucaoForm` `defaultValues`.

## Side Effects
- `[page.tsx:EditarEvolucaoPage]` Server-side Prisma read: `prisma.evolucao.findUnique({ where: { id: evolucaoId } })`.
- `[page.tsx:EditarEvolucaoPage]` Binds server action `updateEvolucao` (`@/actions/evolucoes`) via `updateEvolucao.bind(null, evolucaoId, id)` and passes it as `action` to `EvolucaoForm` (`mode="edit"`, `pacienteId={id}`, `defaultValues` populated with `hdp`, `hda`, `pa`, `fc`, `spo2`, `fr`, `temperatura`, `auscultaPulmonar`, `evolucao`, `conduta`).

## Verification
- Run: `npm test`
