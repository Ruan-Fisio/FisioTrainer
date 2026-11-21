# [id]

## Overview
Dynamic patient-document resource namespace under `/api/documentos/[id]`.

## Subdirectories & Boundaries
- `pdf`: [./pdf/README.md](./pdf/README.md) - Authenticated `GET` handler generating and streaming a filled patient document PDF inline with `Cache-Control: private, no-store`.
