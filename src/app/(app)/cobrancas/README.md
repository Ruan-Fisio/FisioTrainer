# Cobranças Route (`cobrancas`)

## Overview
Server-rendered pending charges route that streams pending patient charges alongside the authenticated professional's Pix CPF/CNPJ into `CobrancasList` behind a `Suspense` boundary with a table loading skeleton.

## Interface
- `[page.tsx:CobrancasPage]` — Default exported page component (no props) wrapping `CobrancasListLoader` in `Suspense` with `TableSkeleton` fallback.
- `[page.tsx:CobrancasListLoader]` — Internal async server component fetching pending charges and the signed-in user's CPF/CNPJ to render `CobrancasList`.
- `[loading.tsx:Loading]` — Default exported route loading skeleton rendering animated header placeholders and `TableSkeleton`.

## Invariants
- `[page.tsx:CobrancasListLoader]` — Guards `prisma.user.findUnique` on `session?.user?.id` being truthy; otherwise resolves `profissional` to `null` and passes `cnpjPix={profissional?.cpfCnpj ?? null}`.

## Side Effects
- `[page.tsx:CobrancasListLoader]` — Calls `auth()` to retrieve the current user session.
- `[page.tsx:CobrancasListLoader]` — Calls `listCobrancasPendentes()` inside `Promise.all`.
- `[page.tsx:CobrancasListLoader]` — Conditionally queries Prisma via `prisma.user.findUnique({ where: { id: session.user.id }, select: { cpfCnpj: true } })` when `session?.user?.id` is present.

## Verification
- Run: `npm test`
