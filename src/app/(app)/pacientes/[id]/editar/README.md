# editar (`[id]/editar`)

## Overview
Next.js App Router server page (`/pacientes/[id]/editar`) for editing a patient's profile. It loads the full patient record by route `id` via Prisma, returns 404 if absent, and renders `PacienteForm` in edit mode wired to `updatePaciente`.

## Interface
- `[page.tsx:EditarPacientePage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:EditarPacientePage]` Calls `notFound()` when `prisma.paciente.findUnique({ where: { id } })` returns null (`if (!paciente) notFound()`). No local session/role or soft-delete guard is declared in this file.

## Side Effects
- `[page.tsx:EditarPacientePage]` Server-side Prisma read: `prisma.paciente.findUnique({ where: { id } })`.
- `[page.tsx:EditarPacientePage]` Binds server action `updatePaciente.bind(null, id)` (`@/actions/pacientes`) and passes it as `action` to `PacienteForm` (`mode="edit"`) with `defaultValues` spreading `paciente` and formatting `dataNascimento` via `toISOString().slice(0, 10)` or `null`.

## Verification
- Run: `npm test`
