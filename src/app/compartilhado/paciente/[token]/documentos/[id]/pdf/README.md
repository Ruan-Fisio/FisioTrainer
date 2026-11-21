# Shared Patient Document PDF Route (`documentos/[id]/pdf`)

## Overview
Token-scoped Next.js App Router GET handler in the shared patient portal that resolves a patient from the portal `token` and streams an inline PDF for a document owned by that patient, returning a uniform HTTP 404 when token resolution or document generation fails.

## Interface
- `[route.ts:GET]` — Exported async HTTP handler `GET(_request: Request, { params }: { params: Promise<{ token: string; id: string }> })` returning `NextResponse`; no metadata or route segment config exports are defined.

## Invariants
- `[route.ts:buscarPacienteIdPorToken]` Resolves `pacienteId` strictly from `params.token` and only calls `gerarPdfDocumento(id, pacienteId)` when `pacienteId` is truthy.
- `[route.ts:GET]` Returns `NextResponse.json({ error: "Documento não encontrado." }, { status: 404 })` whenever `!pdf`, avoiding distinctions between invalid token, missing document, or mismatched owner.

## Side Effects
- `[route.ts:buscarPacienteIdPorToken]` Looks up the patient ID via `buscarPacienteIdPorToken(token)` from `@/lib/acesso-compartilhado`.
- `[route.ts:gerarPdfDocumento]` Retrieves/generates PDF bytes and filename via `gerarPdfDocumento(id, pacienteId)` from `@/lib/documentos-paciente`.
- `[route.ts:GET]` Streams `new Uint8Array(pdf.bytes)` with headers `Content-Type: application/pdf`, `Content-Disposition: inline; filename="${pdf.nomeArquivo}"`, `Cache-Control: private, no-store`, and `X-Robots-Tag: noindex`.

## Verification
- Run: `npm test`
