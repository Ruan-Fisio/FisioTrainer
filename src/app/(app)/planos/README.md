# Planos Route (`planos`)

## Overview
Server-rendered route for managing clinic plans across two tabs (`catalogo` and `renovacoes`) with a searchable paginated catalog table, renewals list, a link to create a new plan (`/planos/novo`), and a table loading skeleton.

## Interface
- `[page.tsx:PlanosPage]` — Default exported async page component accepting `searchParams: Promise<{ tab?: string; page?: string; q?: string }>` (`PageProps`); renders a link to `/planos/novo` and `PlanosTabs` (`tab`, `catalogo`, `renovacoes`) hosting `SearchInput` + `PlanosTable` and `RenovacoesList`, each wrapped in `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering animated header placeholders and `TableSkeleton`.
- Subdirectories:
  - `[id]`: [`./[id]/README.md`](./%5Bid%5D/README.md) — Edit an existing plan.
  - `novo`: [./novo/README.md](./novo/README.md) — Create a new plan.

## Invariants
- `[page.tsx:PlanosPage]` — Restricts `tab` via `params.tab === "renovacoes" ? "renovacoes" : "catalogo"` (defaulting missing or unrecognized values to `"catalogo"`).
- `[page.tsx:PlanosPage]` — Coerces `searchParams.page` via `Number(params.page ?? "1") || 1` and defaults `searchParams.q` via `params.q ?? ""`.
- `[page.tsx:PlanosPage]` — Keys the `catalogo` `Suspense` boundary with `${page}-${search}` so pagination or search changes re-trigger `TableSkeleton`.

## Side Effects
- None

## Verification
- Run: `npm test`
