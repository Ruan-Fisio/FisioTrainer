# Shared Patient Financial Plan (`financeiro/[planoId]`)

## Overview
Async Server Component page in the shared patient portal that displays read-only charges via `PacienteCobrancasList` for either a specific assigned plan (`planoId`) or standalone charges (`planoId === "avulsas"`).

## Interface
- `[page.tsx:FinanceiroPlanoPublicoPage]` — Default export async Server Component accepting `{ params: Promise<{ token: string; planoId: string }> }`; no `metadata`/`generateMetadata` or route segment config exports are defined.

## Invariants
- `[page.tsx:resolverPacientePorToken]` Validates and resolves `{ pacienteId, paciente }` from `params.token` via `resolverPacientePorToken(token)`.
- `[page.tsx:comAcessoPortal]` Loads plan assignments and charges within `comAcessoPortal(pacienteId, ...)`.
- `[page.tsx:notFound]` Treats `planoId === "avulsas"` as standalone charges (`isAvulsas`) and invokes `notFound()` if `!isAvulsas && !atribuicao`.
- `[page.tsx:notFound]` Filters charges by `!c.planoAtribuicaoId` (when `isAvulsas`) or `c.planoAtribuicaoId === planoId`, invoking `notFound()` when `cobrancasFiltradas.length === 0`.
- `[page.tsx:PacienteCobrancasList]` Enforces read-only portal rendering by passing `somenteLeitura`, `pacienteContato={null}`, and `cnpjPix={null}`.

## Side Effects
- `[page.tsx:resolverPacientePorToken]` Resolves the shared portal patient via `resolverPacientePorToken(token)` from `@/lib/acesso-compartilhado`.
- `[page.tsx:comAcessoPortal]` Scopes data fetches under portal access context via `comAcessoPortal(pacienteId, ...)` from `@/lib/sessao`.
- `[page.tsx:listPlanoAtribuicoesByPaciente]` Queries patient plan assignments concurrently via `Promise.all` from `@/actions/plano-atribuicoes`.
- `[page.tsx:getCobrancasByPaciente]` Queries patient charges concurrently via `Promise.all` from `@/actions/cobrancas`.
- `[page.tsx:Link]` Renders an internal Next.js link to `/compartilhado/paciente/${token}?tab=financeiro`.

## Verification
- Run: `npm test`
