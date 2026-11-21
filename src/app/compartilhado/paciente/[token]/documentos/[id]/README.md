# [id]

## Overview
Dynamic patient-document resource namespace inside the shared patient portal under `/compartilhado/paciente/[token]/documentos/[id]`.

## Subdirectories & Boundaries
- `pdf`: [./pdf/README.md](./pdf/README.md) - Token-scoped `GET` route handler streaming a patient-owned document PDF inline with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.
