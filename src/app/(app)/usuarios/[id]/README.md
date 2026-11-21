# Editar Usuário Route (`usuarios/[id]`)

## Overview
Dynamic Next.js App Router page for editing an existing staff user profile. Fetches the user directly from Prisma using an explicit column projection and renders `UsuarioForm` in edit mode bound to `updateUsuario`.

## Interface
- `[page.tsx:EditarUsuarioPage]` — Default exported async page component accepting `{ params: Promise<{ id: string }> }`.
- Rendered child component `UsuarioForm` (imported, not defined in `page.tsx`) receiving `action={updateUsuario.bind(null, id)}`, `defaultValues={usuario}`, and `mode="edit"`.

## Invariants
- `[page.tsx:EditarUsuarioPage]` — Invokes `notFound()` when `prisma.user.findUnique` returns null (`if (!usuario) notFound()`).
- `[page.tsx:EditarUsuarioPage]` — Restricts queried user fields via explicit `select` projection (`name`, `email`, `cref`, `crefito`, `cpfCnpj`, `razaoSocial`, `inscricaoMunicipal`, `telefone`, `endereco`, `atendeFisioterapia`, `atendeEducacaoFisica`).
- `[page.tsx:EditarUsuarioPage]` — Binds route `id` as the first argument to `updateUsuario` (`updateUsuario.bind(null, id)`).

## Side Effects
- `[page.tsx:EditarUsuarioPage]` — Queries Prisma via `prisma.user.findUnique({ where: { id }, select: { ... } })`.

## Verification
- Run: `npm test`
