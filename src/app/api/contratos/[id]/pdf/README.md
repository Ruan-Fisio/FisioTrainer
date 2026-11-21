# Contract PDF Route (`api/contratos/[id]/pdf`)

## Overview
Authenticated Next.js App Router API endpoint that looks up a signed contract's number and storage key in Prisma by `id`, reads the persisted PDF binary from contract storage, and streams it inline.

## Interface
- `[route.ts:GET]` — Exported async HTTP handler `GET(_request: Request, { params }: { params: Promise<{ id: string }> })` returning `NextResponse`; no route segment config exports are defined.
- `[route.ts:params]` — Reads dynamic route parameter `id: string` via `await params`; ignores `_request` and query parameters.

## Invariants
- `[route.ts:auth]` Requires an active session via `await auth()`; returns HTTP `401` JSON (`{ error: "Não autenticado." }`) when `!session` (no role or ownership check beyond session presence).
- `[route.ts:GET]` Requires `contrato?.pdfChave` to be truthy after querying Prisma; returns HTTP `404` JSON (`{ error: "Contrato assinado não encontrado." }`) when the contract does not exist or has no stored PDF key.
- `[route.ts:GET]` Performs no format validation on `params.id` and defines no local `try/catch` error boundary around Prisma or storage calls.

## Side Effects
- `[route.ts:auth]` Invokes `auth()` from `@/lib/auth` to resolve the current session.
- `[route.ts:prisma.contrato.findUnique]` Queries Prisma `contrato` by `{ id }` selecting `{ numero: true, pdfChave: true }`.
- `[route.ts:lerPdfContrato]` Reads stored PDF bytes via `lerPdfContrato(contrato.pdfChave)` from `@/lib/contrato-storage`.
- `[route.ts:formatarNumeroContrato]` Formats the contract number via `formatarNumeroContrato(contrato.numero)` from `@/lib/contrato-regras`.
- `[route.ts:NextResponse]` Streams `new Uint8Array(bytes)` with headers `Content-Type: application/pdf` and `Content-Disposition: inline; filename="Contrato_<numero>.pdf"` (no `Cache-Control` header set).

## Verification
- Run: `npm test`
