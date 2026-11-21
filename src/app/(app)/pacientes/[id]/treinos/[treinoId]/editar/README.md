# editar (`[treinoId]/editar`)

## Overview
Next.js App Router server page (`/pacientes/[id]/treinos/[treinoId]/editar`) for editing a patient's workout (`treinoId`). It concurrently fetches the workout and the ordered exercise catalog, verifies workout existence, and renders `TreinoForm` in edit mode wired to `updateTreinoPaciente`.

## Interface
- `[page.tsx:EditarTreinoPacientePage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; treinoId: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:EditarTreinoPacientePage]` Calls `notFound()` when `getTreinoPaciente(treinoId, id)` returns falsy (`if (!treino) notFound()`).
- `[page.tsx:EditarTreinoPacientePage]` Coerces `treino.descricao` via `treino.descricao ?? ""` and `exercicio.carga` via `exercicio.carga ? Number(exercicio.carga) : null` when building `defaultValues` for `TreinoForm`.

## Side Effects
- `[page.tsx:EditarTreinoPacientePage]` Executes `Promise.all` server-side data loading calling `getTreinoPaciente(treinoId, id)` (`@/actions/treinos-paciente`) and `prisma.exercicio.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, links: { select: { id: true, url: true } } } })`.
- `[page.tsx:EditarTreinoPacientePage]` Binds server action `updateTreinoPaciente.bind(null, treinoId, id)` (`@/actions/treinos-paciente`) and passes it as `action` to `TreinoForm` (`mode="edit"`, ``backHref={`/pacientes/${id}/treinos`}``, `submitLabel="Salvar alterações"`).

## Verification
- Run: `npm test`
