# evolucoes

## Overview
Route group directory (`/pacientes/[id]/evolucoes`) organizing patient clinical evolution creation, detail viewing, and editing routes. Contains no direct page or layout files.

## Subdirectories & Boundaries
- `[evolucaoId]`: [`./[evolucaoId]/README.md`](./%5BevolucaoId%5D/README.md) - Server page (`VisualizarEvolucaoPage`) displaying a single clinical evolution record with detail actions and child `./[evolucaoId]/editar` route.
- novo: [./novo/README.md](./novo/README.md) - Server page (`NovaEvolucaoPage`) for creating a new clinical evolution record via `EvolucaoForm` and `createEvolucao`.
