# novo (`documentos/novo`)

## Overview
Next.js App Router server page (`/pacientes/[id]/documentos/novo`) for creating a new document for an active patient. After checking authentication and active patient existence, it either renders a categorized document template catalog (when `searchParams.tipo` is omitted or invalid) or preloads initial values and renders `DocumentoForm` in create mode.

## Interface
- `[page.tsx:NovoDocumentoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string }>; searchParams: Promise<{ tipo?: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:exigirSessao]` Enforces an authenticated session via `await exigirSessao()` before querying data.
- `[page.tsx:PACIENTE_ATIVO]` Restricts patient lookup to active (non-deleted) records via `where: { id, ...PACIENTE_ATIVO }`.
- `[page.tsx:notFound]` Calls `notFound()` if `prisma.paciente.findFirst` returns no matching active patient.
- `[page.tsx:tipoDocumento]` Validates optional `searchParams.tipo` against `tipoDocumento(tipoSlug)`; when absent or unrecognized (`!tipo`), renders the template catalog picker (`CATEGORIAS_DOCUMENTO`, `TIPOS_DOCUMENTO`) instead of `DocumentoForm`.

## Side Effects
- `[page.tsx:prisma.paciente.findFirst]` Server-side Prisma read: `prisma.paciente.findFirst({ where: { id, ...PACIENTE_ATIVO }, select: { nome: true } })`.
- `[page.tsx:valoresParaNovoDocumento]` When a valid `tipo` is selected, preloads initial server-side form values via `await valoresParaNovoDocumento(id, tipo)`.
- `[page.tsx:criarDocumento]` Binds server action `criarDocumento.bind(null, id, tipo.slug)` and passes it to `DocumentoForm` (`mode="create"`, `tipoSlug={tipo.slug}`, `pacienteId={id}`, `valores={valores}`).

## Verification
- Run: `npm test`
