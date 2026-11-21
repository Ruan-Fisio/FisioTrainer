# Execution Comparative Report Route (`api/execucoes/[execucaoId]/relatorio`)

## Overview
Authenticated Next.js App Router API endpoint that generates and streams an inline comparative evaluation report PDF between an initial exam execution (`execucaoId`) and a follow-up execution (`retornoId`).

## Interface
- `[route.ts:GET]` — Exported async HTTP handler `GET(request: Request, { params }: { params: Promise<{ execucaoId: string }> })` returning `NextResponse`; no route segment config exports are defined.
- `[route.ts:execucaoId]` — Dynamic route parameter `execucaoId: string` awaited from `params`.
- `[route.ts:retornoId]` — Required query parameter `retornoId` identifying the follow-up execution for comparison.

## Invariants
- `[route.ts:session]` Calls `auth()`; returns HTTP `401` JSON (`{ error: "Não autenticado." }`) if `!session`.
- `[route.ts:profissional]` Enforces no explicit role or resource ownership check locally; uses non-null assertions `session.user!.id!` to query the logged-in professional.
- `[route.ts:retornoId]` Returns HTTP `400` JSON (`{ error: "retornoId é obrigatório." }`) when the `retornoId` query parameter is missing/falsy (`!retornoId`).
- `[route.ts:comparativo]` Returns HTTP `404` JSON (`{ error: "Comparativo não encontrado." }`) when `getComparativo(execucaoId, retornoId)` returns a falsy value.
- `[route.ts:titulo]` Selects `"Relatório de avaliação de Educação física"` when `comparativo.exame.tipo === "EDUCACAO_FISICA"`, otherwise `"Relatório de Avaliação Fisioterapêutica"`.
- `[route.ts:buffer]` Derives `graficos` by flat-mapping `graficosDaSecao(secao)` across `comparativo.secoes` and computes `temLinhaComIdeal` from whether any section line has `linha.valorIdeal !== null`.
- `[route.ts:nomeArquivo]` Replaces whitespace in `comparativo.paciente.nome` via `.replace(/\s+/g, "_")` to construct `Ficha_<nome>.pdf`.

## Side Effects
- `[route.ts:comparativo]` Loads comparative evaluation data via `getComparativo(execucaoId, retornoId)` from `@/actions/exame-execucoes`.
- `[route.ts:profissional]` Queries Prisma `prisma.user.findUnique({ where: { id: session.user!.id! }, select: { name: true, cref: true, crefito: true } })`.
- `[route.ts:buffer]` Renders PDF bytes in memory via `renderToBuffer(RelatorioPdfDocument(...))` with `geradoEm: formatarData(new Date())` (`formatarDataHora` aliased as `formatarData`).
- `[route.ts:GET]` Streams `new Uint8Array(buffer)` with headers `Content-Type: application/pdf` and `Content-Disposition: inline; filename="${nomeArquivo}"` (no `Cache-Control` header or logging).

## Verification
- Run: `npm test`
