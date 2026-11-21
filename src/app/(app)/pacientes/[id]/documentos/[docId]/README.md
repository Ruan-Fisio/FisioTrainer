# [docId] (`documentos/[docId]`)

## Overview
Next.js App Router server page (`/pacientes/[id]/documentos/[docId]`) for viewing and editing an existing patient document and linking to its PDF endpoint. It enforces session authentication, verifies document-to-patient ownership and catalog type validity, loads the document via Prisma, and renders `DocumentoForm` in edit mode.

## Interface
- `[page.tsx:EditarDocumentoPage]` Default-exported async Server Component accepting `{ params: Promise<{ id: string; docId: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- `[page.tsx:exigirSessao]` Enforces an authenticated session via `await exigirSessao()` before reading route parameters or querying the database.
- `[page.tsx:prisma.documentoPaciente.findFirst]` Enforces document-to-patient ownership by querying `where: { id: docId, pacienteId: id }`.
- `[page.tsx:notFound]` Validates both document existence (`doc`) and catalog type resolution (`tipoDocumento(doc.tipo)`), invoking `notFound()` when `!doc || !tipo`.

## Side Effects
- `[page.tsx:prisma.documentoPaciente.findFirst]` Server-side Prisma read: `prisma.documentoPaciente.findFirst({ where: { id: docId, pacienteId: id }, include: { paciente: { select: { nome: true } }, autor: { select: { name: true } } } })`.
- `[page.tsx:atualizarDocumento]` Binds server action `atualizarDocumento.bind(null, doc.id)` and passes it to `DocumentoForm` (`mode="edit"`, `tipoSlug={tipo.slug}`, `pacienteId={id}`, `valores={valoresDoBanco(doc.valores)}`).
- `[page.tsx:Link]` Renders a new-tab PDF download/view link to `/api/documentos/${doc.id}/pdf` (`target="_blank"`, `prefetch={false}`).

## Verification
- Run: `npm test`
