# [evolucaoId] (`evolucoes/[evolucaoId]`)

## Overview
Next.js App Router server page (`/pacientes/[id]/evolucoes/[evolucaoId]`) displaying the read-only clinical evolution record (`hdp`, `hda`, vital signs, `auscultaPulmonar`, `evolucao`, `conduta`) with author/timestamp metadata and detail action controls. Also serves as the parent segment for the evolution edit route.

## Interface
- `[page.tsx:VisualizarEvolucaoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; evolucaoId: string }> }`. No named exports (`metadata`, `dynamic`, etc.).
- Subdirectories:
  - [editar](./editar/README.md) - Server page (`EditarEvolucaoPage`) for editing the clinical evolution record via `EvolucaoForm` and `updateEvolucao`.

## Invariants
- `[page.tsx:VisualizarEvolucaoPage]` Calls `notFound()` if `!evolucao || evolucao.pacienteId !== id`, enforcing record existence and patient ownership against route param `id`. No local session/role, `redirect()`, or soft-delete guard is declared in this file.

## Side Effects
- `[page.tsx:VisualizarEvolucaoPage]` Server-side Prisma read: `prisma.evolucao.findUnique({ where: { id: evolucaoId }, include: { paciente: { select: { id: true, nome: true } }, profissional: { select: { id: true, name: true } } } })`.
- `[page.tsx:VisualizarEvolucaoPage]` Mounts `<EvolucaoDetailActions id={evolucaoId} pacienteId={id} />` to handle client-side evolution detail actions.

## Verification
- Run: `npm test`
