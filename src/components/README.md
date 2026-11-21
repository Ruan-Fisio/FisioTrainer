# Components (`src/components`)

## Overview

Shared React UI layer for FisioTrainer, containing the top-level collapsible section primitive (`collapsible-section.tsx`) and 28 domain and design-system component packages covering appointments, authentication, exercise categories, billing, patient portal views, clinic settings, contracts, pre-registration curation, dashboard analytics, expenses, clinical documents, evolutions, exam authoring and executions, exercises, URL filters, layout shell, audit logs, goniometry movements, patients, plan assignments, plans, pre-registration, services, loading skeletons, workouts, shared UI primitives, and staff users.

## Interface

### Direct Symbols
- `[collapsible-section.tsx:"use client"]`: Client component module directive.
- `[collapsible-section.tsx:CollapsibleSection]`: Exported component accepting `{ title: ReactNode; action?: ReactNode; defaultOpen?: boolean; children: ReactNode }` (defaulting `defaultOpen = true`), wrapping Radix-backed `Collapsible`, `CollapsibleTrigger`, and `CollapsibleContent` from `@/components/ui/collapsible`.

### Subdirectories
- [agendamentos](./agendamentos/README.md) — Appointment labels, URL-synced calendar/list tabs, paginated table, availability pickers, rescheduling wizard/dialog, and `./agendamentos/calendario/README.md`.
- [auth](./auth/README.md) — Email/password login form (`LoginForm`) wired to `loginAction`.
- [categorias](./categorias/README.md) — Exercise category create/edit form, usage-gated row actions, and paginated table.
- [cobrancas](./cobrancas/README.md) — Billing charge form, WhatsApp/clipboard/payment row actions, pending list, and grouped patient charge list.
- [compartilhado](./compartilhado/README.md) — Patient-portal action context provider (`AcoesPortalProvider`) and read-only public views for evaluations, documents, evolutions, and plan billing.
- [configuracoes](./configuracoes/README.md) — URL-synced clinic settings tabs for fee rates, operating days/holidays, attendance time slots, and room capacities.
- [contratos](./contratos/README.md) — Contract template editor, paginated contracts list, status badges, structured text view, and electronic signing flow with CPF verification and HTML5 canvas signature pad.
- [curadoria](./curadoria/README.md) — Pre-registration curation queue table, attachment/complaint inspection dialog, rejection dialog, and link copy button.
- [dashboard](./dashboard/README.md) — Upcoming appointments summary widget, Recharts financial analytics, KPI grid, and revenue-vs-expenses comparison card.
- [despesas](./despesas/README.md) — Clinic expense create/edit form, pay/delete row actions, dashboard tab summary, and paginated table.
- [documentos](./documentos/README.md) — Catalog-driven clinical document form (`DocumentoForm`) with PDF preview toast action.
- [evolucoes](./evolucoes/README.md) — Clinical evolution form with automatic vital-sign unit formatting, detail/row actions, patient list, and paginated table.
- [exame-execucoes](./exame-execucoes/README.md) — Multi-section exam execution form (live formulas, shadow history, goniometry, R2 uploads), read-only detail rendering, quick comparison modal/charts, and PDF export controls.
- [exames](./exames/README.md) — Exam template authoring form, formula and reference-table editors, collaborative real-time autosave/merge hook (`useEdicaoTempoReal`), floating sync status, and catalog table.
- [exercicios](./exercicios/README.md) — Exercise catalog table, filters, create/edit form, YouTube/image/site link embeds and preview cards, and share button.
- [filters](./filters/README.md) — Client-side URL query-parameter filters (`DateRangeFilter`, `MesFilter`, `MultiSelectFilter`, `PaginationControls`, `SearchInput`, `ToggleFilter`).
- [layout](./layout/README.md) — Desktop sidebar, mobile sheet nav, static route registry (`navItems`), route-aware `NavLinks`, `UserMenu` with sign-out, and `NumberInputWheelGuard`.
- [logs](./logs/README.md) — Paginated audit log server table (`LogsTable`) and JSON detail dialog (`LogDetalhesDialog`).
- [movimentos](./movimentos/README.md) — Goniometry movement CRUD form, row actions, paginated table, and CSV import dialog.
- [pacientes](./pacientes/README.md) — Patient tables (active/deleted), create/edit form, URL tabs, assisted/service scheduling wizards, recurring schedule editor, attachments, sharing dialog, clinical documents tab, and SVG exam image annotation/comparison dialogs.
- [plano-atribuicoes](./plano-atribuicoes/README.md) — Patient plan assignment form, recurring schedule section, receipt/cancel actions, and active/historical assignment list.
- [planos](./planos/README.md) — Plan catalog form, usage-guarded row actions, table, catalog/renewals tabs, renewable list, and renewal confirmation dialog.
- [pre-cadastro](./pre-cadastro/README.md) — Public pre-registration form (`PreCadastroForm`) and direct-to-R2 presigned file upload component (`ArquivosUpload`).
- [servicos](./servicos/README.md) — Custom clinic service form (rooms and enabled professionals), usage-guarded row actions, and paginated table.
- [skeletons](./skeletons/README.md) — Pure presentational `TableSkeleton` and `UsuariosTableSkeleton` loading placeholders.
- [treinos](./treinos/README.md) — Workout template builder form, exercise combobox picker, assignment dialogs, patient workout cards/lists, row actions, and share button.
- [ui](./ui/README.md) — Shared design-system primitives built on Radix UI, `cmdk`, Recharts, `sonner`, `@dnd-kit`, and CVA (`Button`, `Dialog`, `Table`, `ChartContainer`, `ListaReordenavel`, etc.).
- [usuarios](./usuarios/README.md) — Staff user CRUD form, delete confirmation actions, and paginated table.

## Invariants

- `[collapsible-section.tsx:CollapsibleSection]`: Initializes local `open` state from `defaultOpen` (defaults to `true`); renders `title` inside an `h2` (`text-lg font-semibold`) when `typeof title === "string"` and renders arbitrary `ReactNode` titles directly otherwise.
- `[collapsible-section.tsx:CollapsibleSection]`: Rotates the `ChevronDown` icon `-rotate-90` whenever `!open`.
- Child component packages enforce domain-specific UI validation, delete/in-use guards, pagination resets on filter changes, and read-only patient-portal gating (see linked package contracts).

## Side Effects

- `[collapsible-section.tsx:CollapsibleSection]`: Manages local React `useState` for collapse/expand toggles only (no network, storage, or router side effects).
- Child component packages invoke Server Actions from `@/actions/*`, navigate via Next.js App Router, upload directly via presigned R2 `PUT` requests, emit `sonner` toasts, and interact with browser APIs (clipboard, canvas, resize/wheel/keydown observers); see linked child contracts.

## Verification

- Run: `npm test`
