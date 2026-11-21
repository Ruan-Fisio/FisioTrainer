# Novo Usuário Route (`usuarios/novo`)

## Overview
Next.js App Router page for registering a new staff user. Renders `UsuarioForm` in create mode wired to the `createUsuario` server action.

## Interface
- `[page.tsx:NovoUsuarioPage]` — Default exported page component (no props).
- Rendered child component `UsuarioForm` (imported, not defined in `page.tsx`) receiving `action={createUsuario}` and `mode="create"`.

## Invariants
- None

## Side Effects
- None

## Verification
- Run: `npm test`
