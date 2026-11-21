# novo (`exames/novo`)

## Overview
Next.js App Router server page (`/pacientes/[id]/exames/novo`) for registering a new exam evaluation (`Nova avaliação`) for a patient. It concurrently loads the patient, available exams, and movement catalog, verifies patient existence, and renders `ExameExecucaoForm` bound to `createAvaliacao`.

## Interface
- `[page.tsx:NovaAvaliacaoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:NovaAvaliacaoPage]` Calls `notFound()` when `prisma.paciente.findUnique` returns null (`if (!paciente) notFound()`). No local session/role or soft-delete guard is declared in this file.

## Side Effects
- `[page.tsx:NovaAvaliacaoPage]` Concurrently loads server data via `Promise.all`: `prisma.paciente.findUnique({ where: { id }, select: { id: true, nome: true, sexo: true, idade: true } })`, `listAllExamesCompletos()` (`@/actions/exame-execucoes`), and `listAllMovimentos()` (`@/actions/movimentos`).
- `[page.tsx:NovaAvaliacaoPage]` Binds server action `createAvaliacao.bind(null, id)` (`@/actions/exame-execucoes`) and passes it as `action` to `ExameExecucaoForm` with `exames`, `movimentos`, `pacienteId={id}`, `paciente={{ sexo: paciente.sexo, idade: paciente.idade }}`, ``cancelHref={`/pacientes/${id}`}``, and `successLabel="Avaliação registrada com sucesso."`.

## Verification
- Run: `npm test`
