# novo (`pacientes/novo`)

## Overview
Next.js App Router server page (`/pacientes/novo`) for registering a new patient. When invoked with an optional `preCadastro` query parameter, it loads the pending pre-registration on the server to prefill `PacienteForm`, delegating creation to `createPaciente`.

## Interface
- `[page.tsx:NovoPacientePage]` Default-exported async Server Component accepting `{ searchParams }: PageProps` where `[page.tsx:PageProps]` defines `{ searchParams: Promise<{ preCadastro?: string }> }`. No named exports (`metadata`, `dynamic`, etc.).

## Invariants
- None

## Side Effects
- `[page.tsx:NovoPacientePage]` Awaits `searchParams` and, when `preCadastro` is truthy, calls `buscarPreCadastroPendente(preCadastroId)` (`@/actions/pre-cadastros`) to prefill `defaultValues` (`nome` + `sobrenome`, `contato` via `mascararCelular`, `historicoClinico` from `queixaPrincipal`).
- `[page.tsx:NovoPacientePage]` Passes `createPaciente` (`@/actions/pacientes`) as `action` to `PacienteForm` (`mode="create"`, `preCadastroId={preCadastro?.id}`).

## Verification
- Run: `npm test`
