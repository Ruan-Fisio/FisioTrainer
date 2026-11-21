# Pre-Cadastro

## Overview
Public patient pre-registration route segment combining a branded page layout with static title metadata and the client pre-registration form component.

## Interface
- `[layout.tsx:PreCadastroLayout]` — Default export layout component `PreCadastroLayout({ children }: { children: React.ReactNode })`.
- `[page.tsx:metadata]` — Exported Next.js `Metadata` constant `{ title: "Pré-cadastro" }`.
- `[page.tsx:PreCadastroPage]` — Default export React server component `PreCadastroPage()` accepting no props, with no route segment config exports.

## Invariants
- None

## Side Effects
- `[layout.tsx:PreCadastroLayout]` Renders the static `/logo.png` asset via `next/image` (`<Image src="/logo.png" alt="FisioTrainer" width={523} height={342} priority />`) above `children`.
- `[page.tsx:metadata]` Sets the route's document `title` metadata to `"Pré-cadastro"`.
- `[page.tsx:PreCadastroPage]` Mounts `<PreCadastroForm />` from `@/components/pre-cadastro/pre-cadastro-form`.

## Verification
- Run: `npm test`
