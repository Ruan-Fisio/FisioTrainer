# cobrancas

## Overview
Route group directory (`/pacientes/[id]/cobrancas`) organizing patient charge creation and individual charge editing routes. Contains no direct page or layout files.

## Subdirectories & Boundaries
- `[cobrancaId]`: [`./[cobrancaId]/README.md`](./%5BcobrancaId%5D/README.md) - Dynamic route segment grouping single-charge actions (`./[cobrancaId]/editar`).
- novo: [./novo/README.md](./novo/README.md) - Server page (`NovaCobrancaPage`) for creating a standalone charge for a patient via `CobrancaForm` and `createCobranca`.
