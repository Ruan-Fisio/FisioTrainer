# Despesas Routes (`dashboard/despesas`)

## Overview
Intermediate Next.js App Router grouping for expense creation and editing routes nested under the financial dashboard.

## Subdirectories & Boundaries
- `[id]`: [`./[id]/README.md`](./%5Bid%5D/README.md) - Dynamic route loading an existing expense by ID via `getDespesa` and rendering `DespesaForm` in edit mode bound to `updateDespesa`.
- `nova`: [./nova/README.md](./nova/README.md) - Route rendering `DespesaForm` in create mode initialized with today's date and `"PENDENTE"` status wired to `createDespesa`.
