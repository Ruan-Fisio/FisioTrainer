# pacientes

## Overview
Next.js App Router patient management entry route (`/pacientes`) and its route-level loading skeleton (`loading.tsx`). Parses `page`, `q`, and `excluidos` query parameters to stream either active (`PacientesTable`) or deleted (`PacientesExcluidos`) patient listings inside a keyed `<Suspense>` boundary and links to patient registration (`./novo`) and patient detail hubs (`./[id]`).

## Interface
- `[loading.tsx:Loading]` Default-exported Next.js route loading component rendering pulse placeholder bars and `<TableSkeleton />`. No named exports.
- `[page.tsx:PacientesPage]` Default-exported async Server Component accepting `PageProps` (`{ searchParams: Promise<{ page?: string; q?: string; excluidos?: string }> }`), rendering `<Link href="/pacientes/novo">`, `<SearchInput />`, `<ToggleFilter paramName="excluidos" />`, and a `<Suspense>` boundary switching between `<PacientesExcluidos>` and `<PacientesTable>`. No named exports (`metadata`, `dynamic`, etc.).
- Subdirectories:
  - [`[id]`](./%5Bid%5D/README.md) - Shared active-patient layout guard (`PacienteLayout`) and 8-tab patient detail hub (`PacienteDetailPage`) grouping `cobrancas`, `documentos`, `editar`, `evolucoes`, `exames`, `planos`, and `treinos`.
  - [novo](./novo/README.md) - Server page (`NovoPacientePage`) for registering a new patient with optional `preCadastro` query parameter prefill (`createPaciente`).

## Invariants
- `[page.tsx:PacientesPage]` Normalizes `searchParams.page` via `Number(params.page ?? "1") || 1` (falling back to `1` on missing, `0`, or `NaN`), defaults `search` via `params.q ?? ""`, and switches to the deleted-patients list strictly when `params.excluidos === "1"`.
- `[page.tsx:PacientesPage]` Keys `<Suspense>` by `` `${page}-${search}-${excluidos}` `` with `<TableSkeleton />` fallback so pagination, search, or filter changes reset the suspense boundary.
- `[loading.tsx:Loading]` / `[page.tsx:PacientesPage]` No local auth/session/role guards, `notFound()`, or `redirect()` calls exist in these files.

## Side Effects
- `[page.tsx:PacientesPage]` Delegates server-side data loading inside `<Suspense>` to `<PacientesExcluidos page={page} search={search} />` (when `excluidos` is `true`) or `<PacientesTable page={page} search={search} />` (when `false`); executes no direct Prisma queries or Server Actions in this file.
- `[page.tsx:PacientesPage]` Mounts URL-query filter controls (`<SearchInput defaultValue={search} />`, `<ToggleFilter paramName="excluidos" active={excluidos} />`) and links to `/pacientes/novo`.

## Verification
- Run: `npm test`
