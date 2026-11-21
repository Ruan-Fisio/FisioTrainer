# Curadoria Route (`curadoria`)

## Overview
Server-rendered pre-registration curation queue route displaying per-status counts, status navigation tabs, search filtering, a public link copy button, and a paginated queue table with a loading skeleton.

## Interface
- `[page.tsx:CuradoriaPage]` — Default exported async page component accepting `{ searchParams }: PageProps`.
- `[page.tsx:PageProps]` — Internal prop type defining `searchParams: Promise<{ page?: string; q?: string; status?: string }>`.
- `[page.tsx:ABAS]` — Internal tab definition mapping URL status params (`"pendentes"`, `"rejeitados"`, `"aprovados"`) to domain statuses (`PENDENTE`, `REJEITADO`, `APROVADO`).
- `[page.tsx:CuradoriaPage]` — Renders `CopiarLinkButton`, status navigation tabs, `SearchInput`, and `PreCadastrosList` inside `Suspense` with `TableSkeleton` fallback.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering `Skeleton` placeholders and `TableSkeleton`.

## Invariants
- `[page.tsx:CuradoriaPage]` — Coerces pagination via `Number(params.page ?? "1") || 1` and defaults `search` to `params.q ?? ""`.
- `[page.tsx:CuradoriaPage]` / `[page.tsx:ABAS]` — Matches `params.status` against `ABAS` (`"pendentes"` | `"rejeitados"` | `"aprovados"`) and falls back to `ABAS[0]` (`PENDENTE`) when missing or unrecognized.
- `[page.tsx:CuradoriaPage]` — Keys the `Suspense` boundary wrapping `PreCadastrosList` by `${aba.param}-${page}-${search}`.

## Side Effects
- `[page.tsx:CuradoriaPage]` — Calls `contarPreCadastrosPorStatus()` from `@/actions/pre-cadastros` to retrieve tab counts.

## Verification
- Run: `npm test`
