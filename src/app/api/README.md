# api

## Overview
Next.js App Router API namespace exposing NextAuth authentication endpoints and authenticated staff PDF generation/retrieval handlers for contracts, patient documents, clinical evolutions, exam executions, and plan assignment receipts.

## Subdirectories & Boundaries
- `auth`: [./auth/README.md](./auth/README.md) - Authentication endpoint namespace delegating `GET` and `POST` catch-all NextAuth traffic to `@/lib/auth`.
- `contratos`: [./contratos/README.md](./contratos/README.md) - Contract API namespace serving stored signed-contract PDFs inline.
- `documentos`: [./documentos/README.md](./documentos/README.md) - Patient document API namespace generating and streaming filled document PDFs inline with `private, no-store` caching.
- `evolucoes`: [./evolucoes/README.md](./evolucoes/README.md) - Clinical evolution API namespace rendering and streaming evolution report PDFs inline.
- `execucoes`: [./execucoes/README.md](./execucoes/README.md) - Exam execution API namespace rendering quick multi-execution comparison PDFs and comparative evaluation report PDFs inline.
- `plano-atribuicoes`: [./plano-atribuicoes/README.md](./plano-atribuicoes/README.md) - Plan assignment API namespace rendering and streaming payment/service receipt PDFs inline.
