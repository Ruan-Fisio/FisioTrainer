# Editar Exame Route (`exames/[id]/editar`)

## Overview
Dynamic Next.js App Router page for collaboratively editing an exam. Synchronizes the exam draft state by `id`, redirects stale or archived version URLs to the current version's edit route, and renders `ExameForm` in edit mode.

## Interface
- `[page.tsx:EditarExamePage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- Rendered child component `ExameForm` (imported, not defined in `page.tsx`) receiving `mode="edit"`, `defaultValues={sincronizacao.draft}`, and `edicao={{ exameId: sincronizacao.id, carregadoEm: sincronizacao.carregadoEm, editores: sincronizacao.editores }}`.

## Invariants
- `[page.tsx:EditarExamePage]` — Invokes `notFound()` when `sincronizarExame(id)` returns null/falsy.
- `[page.tsx:EditarExamePage]` — Invokes ``redirect(`/exames/${sincronizacao.id}/editar`)`` when `sincronizacao.id !== id` so archived/stale version links always land on the latest version.

## Side Effects
- `[page.tsx:EditarExamePage]` — Calls `sincronizarExame(id)` from `@/actions/exames`.

## Verification
- Run: `npm test`
