# treinos (`[id]/treinos`)

## Overview
Next.js App Router server page (`/pacientes/[id]/treinos`) listing a patient's assigned workouts and rendering the workout assignment trigger. Also serves as the parent route segment for individual workout item actions.

## Interface
- `[page.tsx:PacienteTreinosPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string }> }`. No named exports (`metadata`, `dynamic`, etc.).
- Subdirectories:
  - [`[treinoId]`](./%5BtreinoId%5D/README.md) - Dynamic route segment grouping single-workout routes (`./[treinoId]/editar`).

## Invariants
- `[page.tsx:PacienteTreinosPage]` Resolves `id` from `await params` and calls `notFound()` if `prisma.paciente.findUnique({ where: { id } })` returns null. No local session/role or soft-delete guard is declared in this file.

## Side Effects
- `[page.tsx:PacienteTreinosPage]` Server-side Prisma read: `prisma.paciente.findUnique({ where: { id } })`.
- `[page.tsx:PacienteTreinosPage]` Loads assigned workouts on the server via `listTreinosPaciente(id)` (`@/actions/treinos-paciente`).
- `[page.tsx:PacienteTreinosPage]` Renders `<AtribuirTreinoButton pacienteId={id} />` and `<TreinosPacienteList treinos={treinos} pacienteId={id} />`.

## Verification
- Run: `npm test`
