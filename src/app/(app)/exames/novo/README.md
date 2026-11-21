# Novo Exame Route (`exames/novo`)

## Overview
Next.js App Router page for creating a new exam. Renders `ExameForm` in create mode wired to the `createExame` server action.

## Interface
- `[page.tsx:NovoExamePage]` — Default exported page component (no props).
- Rendered child component `ExameForm` (imported, not defined in `page.tsx`) receiving `action={createExame}` and `mode="create"`.

## Invariants
- None

## Side Effects
- None

## Verification
- Run: `npm test`
