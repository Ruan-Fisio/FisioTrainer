# Shared Exercise (`[id]`)

## Overview
Public dynamic server component page that loads a single exercise with its categories and ordered reference links by `id`, returning HTTP 404 when not found and displaying category badges alongside link previews.

## Interface
- `[page.tsx:ExercicioCompartilhadoPage]` — Default export async server component `ExercicioCompartilhadoPage({ params }: { params: Promise<{ id: string }> })` with no `metadata`/`generateMetadata` or route segment config exports.

## Invariants
- `[page.tsx:ExercicioCompartilhadoPage]` Calls `notFound()` if `prisma.exercicio.findUnique` returns `null` for `id`.
- `[page.tsx:ExercicioCompartilhadoPage]` Renders the fallback message `"Nenhum link cadastrado para este exercício."` when `exercicio.links.length === 0`, and otherwise renders `<LinkPreviewGrid urls={exercicio.links.map((l) => l.url)} />`.

## Side Effects
- `[page.tsx:ExercicioCompartilhadoPage]` Reads the database via `prisma.exercicio.findUnique` including `categorias` (`id`, `name`) and `links` (`url`, ordered by `createdAt: "asc"`).
- `[page.tsx:ExercicioCompartilhadoPage]` Invokes `notFound()` from `next/navigation` when no exercise matches `id`.
- `[page.tsx:ExercicioCompartilhadoPage]` Renders `<Image src="/logo.png" alt="FisioTrainer" width={523} height={342} priority />`, `<Badge />` (`@/components/ui/badge`), and conditionally mounts `<LinkPreviewGrid />` (`@/components/exercicios/link-preview-grid`).

## Verification
- Run: `npm test`
