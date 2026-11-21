# Document PDF Route (`api/documentos/[id]/pdf`)

## Overview
Authenticated Next.js App Router API endpoint that delegates filled patient-document PDF generation to `gerarPdfDocumento(id)` and streams the resulting PDF inline with `private, no-store` caching.

## Interface
- `[route.ts:GET]` — Exported async HTTP handler `GET(_request: Request, { params }: { params: Promise<{ id: string }> })` returning `NextResponse`; no route segment config exports are defined.
- `[route.ts:params]` — Reads dynamic route parameter `id: string` via `await params`; ignores `_request` and query parameters.

## Invariants
- `[route.ts:auth]` Requires an active session via `await auth()`; returns HTTP `401` JSON (`{ error: "Não autenticado." }`) when `!session` (no role check; invokes `gerarPdfDocumento(id)` without a `pacienteId` owner filter).
- `[route.ts:GET]` Returns HTTP `404` JSON (`{ error: "Documento não encontrado." }`) when `gerarPdfDocumento(id)` returns a falsy/null result (`!pdf`).
- `[route.ts:GET]` Performs no format validation on `params.id` and defines no local `try/catch` error boundary around helper execution.

## Side Effects
- `[route.ts:auth]` Invokes `auth()` from `@/lib/auth` to resolve the current session.
- `[route.ts:gerarPdfDocumento]` Calls `gerarPdfDocumento(id)` from `@/lib/documentos-paciente` to fetch and generate `{ bytes, nomeArquivo }`.
- `[route.ts:NextResponse]` Streams `new Uint8Array(pdf.bytes)` with headers `Content-Type: application/pdf`, `Content-Disposition: inline; filename="<pdf.nomeArquivo>"`, and `Cache-Control: private, no-store`.

## Verification
- Run: `npm test`
