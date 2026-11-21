# Movimentos Components

## Overview
Provides UI components for listing, creating, editing, deleting, and CSV-importing goniometry movements (`movimentos`) backed by server actions from `@/actions/movimentos`.

## Interface
- `[movimento-csv-import.tsx:MovimentoCsvImport]`: Client component (`"use client"`) taking no props; renders a dialog with a CSV upload form wired to `importMovimentosCsv`.
- `[movimento-form.tsx:MovimentoForm]`: Client component (`"use client"`) accepting `{ action: (prevState: MovimentoActionState, formData: FormData) => Promise<MovimentoActionState>; defaultValues?: { nome: string; grauIdeal: string }; mode: "create" | "edit" }`.
- `[movimento-row-actions.tsx:MovimentoRowActions]`: Client component (`"use client"`) accepting `{ id: string; nome: string }`; renders an edit link and a delete confirmation dialog.
- `[movimentos-table.tsx:MovimentosTable]`: Async server component accepting `{ page: number; search: string }`; fetches and renders paginated movements in responsive mobile card and desktop table layouts with `PaginationControls`.

## Invariants
- `[movimento-csv-import.tsx:MovimentoCsvImport]`: File `<input>` (`id="file"`, `name="file"`, `type="file"`) enforces `accept=".csv,text/csv"` and `required`; dialog compares `state !== lastHandledState` so `setOpen(false)` runs once per new successful state reference and renders `state.error` inline when truthy.
- `[movimento-csv-import.tsx:SubmitButton]`: Disables submit button while `useFormStatus().pending` is `true`.
- `[movimento-form.tsx:MovimentoForm]`: Uncontrolled inputs `nome` and `grauIdeal` are HTML `required` and initialized from `defaultValues`; `mode` selects submit label (`"Criar movimento"` vs `"Salvar alterações"`) and success toast message; renders `state.error` inline when truthy.
- `[movimento-row-actions.tsx:MovimentoRowActions]`: Edit `<Link>` targets `/biblioteca-movimento/goniometria/${id}`; deletion requires dialog confirmation and disables the confirm button while `isPending` (`useTransition`) is `true`.
- `[movimentos-table.tsx:MovimentosTable]`: Returns an empty-state `Card` (`"Nenhum movimento encontrado."`) when `movimentos.length === 0`; otherwise renders total count, mobile cards (`md:hidden`), desktop table (`hidden md:block`), and `PaginationControls`.

## Side Effects
- `[movimento-csv-import.tsx:MovimentoCsvImport]`: Submits multipart `FormData` to `importMovimentosCsv` via `useActionState`; on `state.success` in `useEffect`, calls `toast.success(...)` and resets the form via `formRef.current?.reset()`.
- `[movimento-form.tsx:MovimentoForm]`: Submits `FormData` to the injected `action` via `useActionState`; on `state.success` in `useEffect`, calls `toast.success(...)` and navigates via `router.push("/biblioteca-movimento/goniometria")`; `FormActions` `onCancel` also navigates to `/biblioteca-movimento/goniometria`.
- `[movimento-row-actions.tsx:handleDelete]`: Calls server action `deleteMovimento(id)` inside `startTransition`, invoking `toast.success(...)` and closing the dialog on resolution or `toast.error(...)` on rejection.
- `[movimentos-table.tsx:MovimentosTable]`: Invokes `await listMovimentos({ q: search }, page)` during server render.

## Verification
- Run: `npm test`
