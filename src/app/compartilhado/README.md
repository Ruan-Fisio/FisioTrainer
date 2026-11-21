# compartilhado

## Overview
Public shared-access route namespace grouping unauthenticated and token-scoped views for contract signing, exercise previews, the patient portal, and active patient workouts.

## Subdirectories & Boundaries
- `contrato`: [./contrato/README.md](./contrato/README.md) - Token-addressed public contract signing route (`[token]`) with non-indexable metadata, eligibility/CPF guards, and `<AssinarContratoFluxo />`.
- `exercicios`: [./exercicios/README.md](./exercicios/README.md) - Public shared exercise view (`[id]`) rendering exercise categories and ordered link previews.
- `paciente`: [./paciente/README.md](./paciente/README.md) - Token-scoped patient portal (`[token]`) providing a branded shell, eight-tab patient dashboard, and child routes for document PDFs, exam executions, and financial plans.
- `treinos`: [./treinos/README.md](./treinos/README.md) - Public active workouts route (`[pacienteId]`) rendering an active patient's workouts and weekday exercise prescriptions directly by `pacienteId`.
