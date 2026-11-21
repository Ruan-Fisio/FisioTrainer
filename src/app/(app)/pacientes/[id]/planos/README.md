# planos

## Overview
Route group directory (`/pacientes/[id]/planos`) organizing patient plan assignment creation and editing routes. Contains no direct page or layout files.

## Subdirectories & Boundaries
- `[atribuicaoId]`: [`./[atribuicaoId]/README.md`](./%5BatribuicaoId%5D/README.md) - Dynamic route segment grouping single plan assignment routes (`./[atribuicaoId]/editar`).
- novo: [./novo/README.md](./novo/README.md) - Server page (`NovaAtribuicaoPlanoPage`) for assigning a catalog plan to a patient via `PlanoAtribuicaoForm` and `createPlanoAtribuicao`.
