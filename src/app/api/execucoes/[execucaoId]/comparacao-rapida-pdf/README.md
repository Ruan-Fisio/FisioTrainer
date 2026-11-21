# Quick Comparison PDF Route (`api/execucoes/[execucaoId]/comparacao-rapida-pdf`)

## Overview
Authenticated Next.js App Router API endpoint that generates and streams an inline PDF comparing multiple exam executions for a patient using `@react-pdf/renderer`, with optional numeric-series filtering via query parameters.

## Interface
- `[route.ts:GET]` — Exported async HTTP handler `GET(request: Request, { params }: { params: Promise<{ execucaoId: string }> })` returning `NextResponse`; no route segment config exports are defined.
- `[route.ts:execucaoId]` — Dynamic route parameter `execucaoId: string` awaited from `params`.
- `[route.ts:execucoesParam]` — Required query parameter `execucoes`, parsed as comma-separated execution IDs (`execucoesParam.split(",").filter(Boolean)`).
- `[route.ts:camposParam]` — Optional query parameter `campos`: when absent (`null`), includes all numeric series; when present (including empty string), splits on `","` and filters out empty tokens to select specific series keys.

## Invariants
- `[route.ts:session]` Calls `auth()`; returns HTTP `401` JSON (`{ error: "Não autenticado." }`) if `!session`.
- `[route.ts:profissional]` Enforces no explicit role or resource ownership check locally; uses non-null assertions `session.user!.id!` to query the logged-in professional.
- `[route.ts:execucoesParam]` Returns HTTP `400` JSON (`{ error: "execucoes é obrigatório." }`) when the `execucoes` query parameter is missing/falsy (`!execucoesParam`).
- `[route.ts:comparacao]` Returns HTTP `404` JSON (`{ error: "Comparação não encontrada." }`) when `getComparacaoRapida(execucaoId, execucaoIds)` returns a falsy value.
- `[route.ts:series]` Calls `filtrarSeriesPorChaves(montarSeriesNumericas(...), camposParam === null ? null : camposParam.split(",").filter(Boolean))`, so omitted `campos` preserves all series whereas an empty `campos` parameter passes an empty filter list.
- `[route.ts:nomeArquivo]` Replaces whitespace in `comparacao.paciente.nome` via `.replace(/\s+/g, "_")` to construct `Comparacao_<nome>.pdf`.

## Side Effects
- `[route.ts:comparacao]` Loads multi-execution comparison data via `getComparacaoRapida(execucaoId, execucaoIds)` from `@/actions/exame-execucoes`.
- `[route.ts:profissional]` Queries Prisma `prisma.user.findUnique({ where: { id: session.user!.id! }, select: { name: true, cref: true, crefito: true } })`.
- `[route.ts:buffer]` Renders PDF bytes in memory via `renderToBuffer(ComparacaoRapidaPdfDocument(...))` with `geradoEm: formatarData(new Date())`.
- `[route.ts:GET]` Streams `new Uint8Array(buffer)` with headers `Content-Type: application/pdf` and `Content-Disposition: inline; filename="${nomeArquivo}"` (no `Cache-Control` header or logging).

## Verification
- Run: `npm test`
