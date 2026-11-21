# Usuários Route (`usuarios`)

## Overview
Server-rendered route for listing and searching application staff users with URL-driven pagination, a link to create a new user (`/usuarios/novo`), and a dedicated users table loading skeleton.

## Interface
- `[page.tsx:UsuariosPage]` — Default exported async page component accepting `searchParams: Promise<{ page?: string; q?: string }>` (`PageProps`); renders a link to `/usuarios/novo`, `SearchInput`, and `UsuariosTable` inside `Suspense` with `UsuariosTableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering animated header placeholders and `UsuariosTableSkeleton`.
- Subdirectories:
  - `[id]`: [`./[id]/README.md`](./%5Bid%5D/README.md) — Edit an existing staff user.
  - `novo`: [./novo/README.md](./novo/README.md) — Create a new staff user.

## Invariants
- `[page.tsx:UsuariosPage]` — Coerces `searchParams.page` via `Number(params.page ?? "1") || 1` and defaults `searchParams.q` via `params.q ?? ""`.
- `[page.tsx:UsuariosPage]` — Keys the `Suspense` boundary with `${page}-${search}` so pagination or search changes re-trigger `UsuariosTableSkeleton`.

## Side Effects
- None

## Verification
- Run: `npm test`
