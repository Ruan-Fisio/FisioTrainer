# Shared Patient Workouts (`treinos/[pacienteId]`)

## Overview
Public shared workouts route combining an async Server Component (`page.tsx`) that loads an active patient and their active workouts directly from Prisma by `pacienteId`, with an interactive Client Component (`treino-compartilhado-view.tsx`) for selecting workouts, browsing weekday tabs, and viewing exercise prescriptions and embedded links.

## Interface
- `[page.tsx:TreinosCompartilhadoPage]` — Default export async Server Component accepting `{ params: Promise<{ pacienteId: string }> }`; no `metadata`/`generateMetadata` or route segment config exports are defined.
- `[treino-compartilhado-view.tsx:"use client"]` — Client component module directive.
- `[treino-compartilhado-view.tsx:TreinoCompartilhadoView]` — Exported Client Component accepting `{ treinos: TreinoView[] }`.

## Invariants
- `[page.tsx:PACIENTE_ATIVO]` Queries the patient directly by `params.pacienteId` using `where: { id: pacienteId, ...PACIENTE_ATIVO }` without token validation or session authentication.
- `[page.tsx:notFound]` Calls `notFound()` if `!paciente`.
- `[page.tsx:prisma.treino.findMany]` Restricts workouts to `where: { pacienteId, ativo: true }` ordered by `createdAt: "desc"`, with nested `dias` and `exercicios` ordered by `ordem: "asc"`, converting `exercicio.carga` via `Number(exercicio.carga)` or `null`.
- `[page.tsx:TreinosCompartilhadoPage]` Renders the empty-state card (`"Nenhum treino ativo no momento."`) instead of `TreinoCompartilhadoView` when `treinos.length === 0`.
- `[treino-compartilhado-view.tsx:treinoSelecionado]` Resolves the selected workout via `treinos.find((t) => t.id === treinoId) ?? null` and renders the workout list view when `!treinoSelecionado`.
- `[treino-compartilhado-view.tsx:diasComExercicios]` Filters `DIAS_SEMANA` to days with `d.exercicios.length > 0`; renders the empty-state card (`"Nenhum exercício cadastrado neste treino."`) when `diasComExercicios.length === 0`, otherwise initializes `Tabs` `defaultValue` to `diasComExercicios[0]`.
- `[treino-compartilhado-view.tsx:TreinoCompartilhadoView]` Conditionally renders the exercise stats grid only when `series`, `repeticoes`, `carga != null`, or `descanso != null`; renders instructions only when `exercicio.instrucoes` is truthy; renders the links container only when `exercicio.exercicio.links.length > 0`.

## Side Effects
- `[page.tsx:prisma.paciente.findFirst]` Reads Prisma `paciente` selecting `{ id, nome }` via `@/lib/prisma`.
- `[page.tsx:prisma.treino.findMany]` Reads Prisma `treino` with nested `dias`, `exercicios`, and `exercicio` (`id`, `name`, `links`) via `@/lib/prisma`.
- `[treino-compartilhado-view.tsx:ExercicioLinkEmbed]` Mounts `ExercicioLinkEmbed` (`@/components/exercicios/exercicio-link-embed`) for each external `link.url` attached to an exercise.

## Verification
- Run: `npm test`
