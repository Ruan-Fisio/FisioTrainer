# exames

## Overview
Route group directory (`/pacientes/[id]/exames`) organizing patient exam evaluation creation, execution inspection, follow-up recording, editing, and comparative reporting routes. Contains no direct page or layout files.

## Subdirectories & Boundaries
- `[execucaoId]`: [`./[execucaoId]/README.md`](./%5BexecucaoId%5D/README.md) - Server page (`ExecucaoDetailPage`) displaying an exam execution (`AVALIACAO` or `RETORNO`) with child `./comparar`, `./editar`, and `./retorno` routes.
- novo: [./novo/README.md](./novo/README.md) - Server page (`NovaAvaliacaoPage`) for registering a new exam evaluation via `ExameExecucaoForm` and `createAvaliacao`.
