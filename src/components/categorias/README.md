# categorias

## Overview
UI components for managing exercise categories in the library (`/biblioteca/categorias`), including a create/edit form, usage-gated row edit/delete controls, and a paginated responsive server-rendered category listing.

## Interface
- `[categoria-form.tsx:CategoriaForm]` — Client Component (`"use client"`) accepting `{ action: (prevState: CategoriaActionState, formData: FormData) => Promise<CategoriaActionState>; defaultValues?: { name: string }; mode: "create" | "edit" }`; renders the category creation/edition form.
- `[categoria-row-actions.tsx:CategoriaRowActions]` — Client Component (`"use client"`) accepting `{ id: string; name: string; exerciciosCount: number }`; renders per-category edit navigation and a confirmation-gated delete action.
- `[categorias-table.tsx:CategoriasTable]` — Async Server Component accepting `{ page: number; search: string }`; fetches and renders paginated categories as mobile cards and a desktop table.

## Invariants
- `[categoria-form.tsx:CategoriaForm]` — The `name` input enforces the HTML `required` attribute; `mode` (`"create" | "edit"`) controls both the submit button label and success toast copy.
- `[categoria-row-actions.tsx:CategoriaRowActions]` — Deletion is disabled in the UI when `exerciciosCount > 0` (`inUse`), rendering a disabled button with an explanatory `Tooltip` instead of the confirmation `Dialog`.
- `[categoria-row-actions.tsx:CategoriaRowActions]` — The confirmation dialog delete button is disabled while `isPending` is true (`disabled={isPending}`).
- `[categorias-table.tsx:CategoriasTable]` — When `categorias.length === 0`, renders only an empty-state Card and omits the count summary, responsive layouts, and `PaginationControls`.

## Side Effects
- `[categoria-form.tsx:CategoriaForm]` — Submits form data to the caller-supplied server `action` via `useActionState(action, initialState)`.
- `[categoria-form.tsx:CategoriaForm]` — On `state.success` inside `useEffect`, displays `toast.success(...)` and navigates to `"/biblioteca/categorias"` via `router.push`; canceling via `FormActions` also calls `router.push("/biblioteca/categorias")`.
- `[categoria-row-actions.tsx:handleDelete]` — Invokes server action `deleteCategoria(id)` inside `startTransition`, displays `toast.success` or `toast.error`, and closes the dialog on success.
- `[categoria-row-actions.tsx:CategoriaRowActions]` — Renders a Next.js `Link` to `/biblioteca/categorias/${id}`.
- `[categorias-table.tsx:CategoriasTable]` — Queries categories on server render by awaiting `listCategorias({ q: search }, page)`.

## Verification
- Run: `npm test`
