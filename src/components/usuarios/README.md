# Usuarios Components

## Overview
Provides UI components for listing, creating, editing, and deleting clinic users (`usuários`), including a client create/edit form with care modality flags and billing/invoice details, row-level edit and delete confirmation actions, and an async server component table with responsive mobile cards and pagination.

## Interface
- `[usuario-form.tsx:UsuarioForm]`: Client component (`"use client"`) accepting `{ action: (prevState: UsuarioActionState, formData: FormData) => Promise<UsuarioActionState>; defaultValues?: { name: string; email: string; cref?: string | null; crefito?: string | null; cpfCnpj?: string | null; razaoSocial?: string | null; inscricaoMunicipal?: string | null; telefone?: string | null; endereco?: string | null; atendeFisioterapia?: boolean; atendeEducacaoFisica?: boolean }; mode: "create" | "edit" }`.
- `[usuario-row-actions.tsx:UsuarioRowActions]`: Client component (`"use client"`) accepting `{ id: string; name: string }`.
- `[usuarios-table.tsx:UsuariosTable]`: Async server component accepting `{ page: number; search: string }`.
- `[assinatura-card.tsx:AssinaturaCard]`: Client component accepting `{ atual: string | null }` (PNG data URL of the logged user's current signature); draw (`AssinaturaPad`) or photo upload, preview, save and remove with confirmation. The page passes `key` = current version id so save/remove remounts it.
- `[assinatura-processar.ts:processarFotoAssinatura]` / `processarDesenhoAssinatura`: Browser-only (canvas) pipeline returning `{ ok: true; dataUrl } | { ok: false; erro }` — clears paper background, crops, scales to ≤ 900×300, rejects PNG > 300 KB.

## Invariants
- `[usuario-form.tsx:UsuarioForm]`: HTML constraints mark `name` and `email` (`type="email"`) as `required`, while `password` (`type="password"`) is `required={mode === "create"}` and optional in `"edit"` mode; renders server-returned `state.error` inline when truthy.
- `[usuario-form.tsx:UsuarioForm]`: Care modality checkboxes `atendeFisioterapia` and `atendeEducacaoFisica` default to `false`, and optional text fields (`cref`, `crefito`, `razaoSocial`, `cpfCnpj`, `inscricaoMunicipal`, `telefone`, `endereco`) coalesce nullish values to `""`.
- `[usuario-row-actions.tsx:UsuarioRowActions]`: Deletion requires confirmation inside a `Dialog` and disables the destructive confirm button while `isPending` (`useTransition`) is `true`.
- `[usuarios-table.tsx:UsuariosTable]`: Renders an empty-state `Card` (`Nenhum usuário encontrado.`) when `usuarios.length === 0`.
- `[usuarios-table.tsx:ModalidadesBadges]`: Renders `"—"` when both `atendeFisioterapia` and `atendeEducacaoFisica` are `false`.
- `[usuarios-table.tsx:getInitials]`: Computes avatar initials from at most the first 2 non-empty space-separated tokens of `name`, uppercased.

- `[assinatura-card.tsx:AssinaturaCard]`: "Salvar assinatura" stays disabled while there is no processed image, an error, processing, or a pending save; errors render in a `role="alert"` paragraph.

## Side Effects
- `[usuario-form.tsx:UsuarioForm]`: Submits `FormData` to the injected `action` via `useActionState(action, initialState)`; on `state.success` in `useEffect`, calls `toast.success(...)` and navigates via `router.push("/usuarios")`; `FormActions` cancel also calls `router.push("/usuarios")`.
- `[usuario-row-actions.tsx:handleDelete]`: Calls server action `deleteUsuario(id)` inside `startTransition`, triggering `toast.success(...)` and closing the dialog on success or `toast.error(...)` on error; renders edit ``<Link href={`/usuarios/${id}`}>``.
- `[usuarios-table.tsx:UsuariosTable]`: Invokes `await listUsuarios({ q: search }, page)` during server render.

- `[assinatura-card.tsx:AssinaturaCard]`: Calls `salvarMinhaAssinatura` / `removerMinhaAssinatura` in `startTransition`, toasts and `router.refresh()`.

## Verification
- Run: `npm test`
