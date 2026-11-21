# documentos

## Overview
Route group directory (`/pacientes/[id]/documentos`) organizing patient document creation, template selection, viewing/editing, and PDF export links. Contains no direct page or layout files.

## Subdirectories & Boundaries
- `[docId]`: [`./[docId]/README.md`](./%5BdocId%5D/README.md) - Server page (`EditarDocumentoPage`) for editing an existing patient document (`atualizarDocumento`) and opening its PDF endpoint.
- novo: [./novo/README.md](./novo/README.md) - Server page (`NovoDocumentoPage`) for selecting a document template and creating a new patient document (`criarDocumento`).
