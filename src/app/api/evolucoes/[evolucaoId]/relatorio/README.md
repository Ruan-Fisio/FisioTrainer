# Evolution Report Route (`api/evolucoes/[evolucaoId]/relatorio`)

## Overview
Authenticated Next.js App Router API endpoint that loads a clinical evolution record (`evolucao`) with its patient and professional metadata from Prisma, renders a PDF report in memory via `@react-pdf/renderer`, and returns it inline.

## Interface
- `[route.ts:GET]` — Exported async HTTP handler `GET(request: Request, { params }: { params: Promise<{ evolucaoId: string }> })` returning `NextResponse`; no route segment config exports are defined.
- `[route.ts:params]` — Reads dynamic route parameter `evolucaoId: string` via `await params`; `request` and query parameters are unused.

## Invariants
- `[route.ts:auth]` Requires an active session via `await auth()`; returns HTTP `401` JSON (`{ error: "Não autenticado." }`) when `!session` (no role or professional/patient ownership check).
- `[route.ts:GET]` Returns HTTP `404` JSON (`{ error: "Evolução não encontrada." }`) when `prisma.evolucao.findUnique` returns `null` (`!evolucao`).
- `[route.ts:GET]` Performs no format validation on `params.evolucaoId`, defines no local `try/catch` around Prisma or PDF rendering, and sanitizes `evolucao.paciente.nome` only by replacing whitespace (`/\s+/g` -> `"_"`) for the `Content-Disposition` filename.

## Side Effects
- `[route.ts:auth]` Invokes `auth()` from `@/lib/auth` to resolve the current session.
- `[route.ts:prisma.evolucao.findUnique]` Queries Prisma `evolucao` by `{ id: evolucaoId }` including `paciente: { select: { nome: true } }` and `profissional: { select: { name: true, cref: true, crefito: true } }`.
- `[route.ts:renderToBuffer]` Renders `EvolucaoPdfDocument` (`@/lib/pdf/evolucao-documento`) to a PDF `Buffer` via `@react-pdf/renderer`, formatting `evolucao.data` and `new Date()` with `formatarDataHora` (aliased as `formatarData` from `@/lib/format`).
- `[route.ts:NextResponse]` Streams `new Uint8Array(buffer)` with headers `Content-Type: application/pdf` and `Content-Disposition: inline; filename="Evolucao_<pacienteNome>.pdf"` (no `Cache-Control` header set).

## Verification
- Run: `npm test`
