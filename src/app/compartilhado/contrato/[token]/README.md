# Shared Contract Signing (`[token]`)

## Overview
Token-addressed public route segment for contract signing. Re-exports the shared patient portal layout with non-indexable, `no-referrer` metadata, validates the contract token and eligibility against Prisma, and renders either a status notice or the signing flow with minimal pre-verification data.

## Interface
- `[layout.tsx:default]` — Re-exports the default layout from `@/app/compartilhado/paciente/[token]/layout`.
- `[layout.tsx:metadata]` — Exported Next.js `Metadata` constant `{ title: "Assinatura de contrato", robots: { index: false, follow: false }, referrer: "no-referrer" }`.
- `[page.tsx:AssinarContratoPage]` — Default export async server component `AssinarContratoPage({ params }: { params: Promise<{ token: string }> })` with no route segment config exports.

## Invariants
- `[page.tsx:AssinarContratoPage]` Calls `notFound()` if `prisma.contrato.findUnique` returns `null` for `token`.
- `[page.tsx:AssinarContratoPage]` Short-circuits signing and renders `<Aviso titulo="Contrato indisponível" ... />` when `contrato.paciente.excluidoEm` is truthy or `contrato.status` is `"CANCELADO"` or `"SUBSTITUIDO"`.
- `[page.tsx:AssinarContratoPage]` Short-circuits signing and renders `<Aviso titulo="Falta um dado para assinar" ... />` when `!contrato.paciente.cpf?.trim()`.
- `[page.tsx:AssinarContratoPage]` Passes only `token`, `primeiroNome` (`contrato.paciente.nome.split(/\s+/)[0]`), `planoNome`, and `formatarNumeroContrato(contrato.numero)` to `<AssinarContratoFluxo />`, withholding full patient name and CPF before verification.

## Side Effects
- `[layout.tsx:metadata]` Configures Next.js document `title`, `robots` (`index: false, follow: false`), and `referrer` (`"no-referrer"`).
- `[page.tsx:AssinarContratoPage]` Reads the database via `prisma.contrato.findUnique` selecting contract `numero`, `status`, `paciente` (`nome`, `cpf`, `excluidoEm`), and `planoAtribuicao` (`planoNome`).
- `[page.tsx:AssinarContratoPage]` Invokes `notFound()` from `next/navigation` when no matching contract exists.
- `[page.tsx:AssinarContratoPage]` Formats the contract number via `formatarNumeroContrato` (`@/lib/contrato-regras`) and mounts `<AssinarContratoFluxo />` (`@/components/contratos/assinar-contrato-fluxo`) or a local `<Aviso />` card (`@/components/ui/card`).

## Verification
- Run: `npm test`
