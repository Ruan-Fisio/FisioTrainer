# Next.js App Router (`src/app`)

## Overview

Top-level Next.js App Router tree for FisioTrainer. Defines the HTML document root (`RootLayout`) with `pt-BR` locale, Geist fonts, global providers (`TooltipProvider`, `Toaster`, `NumberInputWheelGuard`), and root redirect (`/` -> `/dashboard`), and groups all application routes into five top-level segments: authenticated clinic routes (`(app)`), public authentication (`(auth)`), public pre-registration (`pre-cadastro`), public/token-scoped shared portals (`compartilhado`), and HTTP API handlers (`api`).

## Interface

### Direct Symbols
- `[layout.tsx:metadata]`: Exported `Metadata` setting `title: "FisioTrainer"` and `description: "Gestão de consultas para fisioterapeutas"`.
- `[layout.tsx:RootLayout]`: Default-exported root layout accepting `LayoutProps<"/">`, loading `Geist` (`--font-geist-sans`) and `Geist_Mono` (`--font-geist-mono`) via `next/font/google`, importing `./globals.css`, and wrapping `{children}` in `<TooltipProvider>`, `<Toaster richColors position="top-right" />`, and `<NumberInputWheelGuard />`.
- `[page.tsx:Home]`: Default-exported Server Component for `/` that unconditionally calls `redirect("/dashboard")` (`next/navigation`).

### Subdirectories
- [(app)](./%28app%29/README.md) — Authenticated clinic workspace shell (`AppLayout`) and 16 internal management route groups (agenda, biblioteca, biblioteca-movimento, cobrancas, configuracoes, contratos, curadoria, dashboard, evolucoes, exames, logs, pacientes, planos, servicos, treinos, usuarios).
- [(auth)](./%28auth%29/README.md) — Public authentication route group containing `/login`.
- [api](./api/README.md) — NextAuth catch-all API handler (`/api/auth/[...nextauth]`) and authenticated staff PDF endpoints for contracts, patient documents, evolutions, exam execution comparisons/reports, and plan assignment receipts.
- [compartilhado](./compartilhado/README.md) — Public and token-scoped shared routes for electronic contract signing (`/compartilhado/contrato/[token]`), shared exercises (`/compartilhado/exercicios/[id]`), patient portal (`/compartilhado/paciente/[token]`), and public active workouts (`/compartilhado/treinos/[pacienteId]`).
- [pre-cadastro](./pre-cadastro/README.md) — Public patient pre-registration form and layout (`/pre-cadastro`).

## Invariants

- `[layout.tsx:RootLayout]`: Always renders `<html lang="pt-BR">` with Geist Sans/Mono CSS variables and mounts `<TooltipProvider>`, `<Toaster>`, and `<NumberInputWheelGuard>` globally across both authenticated and public routes.
- `[page.tsx:Home]`: Never renders page content; always issues a Next.js server redirect to `"/dashboard"`.
- Child route groups separate session-protected clinic pages (`(app)`), session-gated PDF APIs (`api`), token-gated portal/contract flows (`compartilhado/paciente/[token]`, `compartilhado/contrato/[token]`), and public intake/share views (`(auth)`, `pre-cadastro`, `compartilhado/exercicios/[id]`, `compartilhado/treinos/[pacienteId]`).

## Side Effects

- `[layout.tsx:RootLayout]`: Registers global font CSS variables (`next/font/google`), global toast portal (`Toaster`), and document-level wheel capture listener via `<NumberInputWheelGuard />`.
- `[page.tsx:Home]`: Triggers a Next.js server redirect to `/dashboard`.
- Child route trees execute Prisma queries, NextAuth session checks, R2/local PDF retrieval, `@react-pdf/renderer` PDF streaming, and Server Action mutations; see linked child contracts.

## Verification

- Run: `npm test`
