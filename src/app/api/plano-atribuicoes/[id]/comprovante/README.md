# Plan Assignment Receipt Route (`api/plano-atribuicoes/[id]/comprovante`)

## Overview
Authenticated Next.js App Router API endpoint that loads a `PlanoAtribuicao` record (with patient and ordered installments) plus the authenticated provider's profile from Prisma, formats financial and installment tables, and streams an inline receipt PDF (`ComprovantePdfDocument`).

## Interface
- `[route.ts:GET]` — Exported async HTTP handler `GET(_request: Request, { params }: { params: Promise<{ id: string }> })` returning `NextResponse`; no route segment config exports are defined.
- `[route.ts:id]` — Dynamic route parameter `id: string` awaited from `params`; `_request` and query parameters are unused.

## Invariants
- `[route.ts:session]` Calls `auth()`; returns HTTP `401` JSON (`{ error: "Não autenticado." }`) if `!session`.
- `[route.ts:atribuicao]` Enforces no explicit role or ownership check on `planoAtribuicao`; returns HTTP `404` JSON (`{ error: "Atribuição não encontrada." }`) when `!atribuicao`.
- `[route.ts:profissional]` Uses non-null assertions `session.user!.id!` to load provider (`prestador`) details for the authenticated user.
- `[route.ts:percentualDesconto]` Computes `valorOriginal > 0 ? (desconto / valorOriginal) * 100 : 0` to prevent division by zero, converting `valorOriginal`, `desconto`, and `valor` via `Number(...)`.
- `[route.ts:valores]` Formats discount with percentage (`${formatarMoeda(desconto)} (${percentualDesconto.toFixed(1)}%)`) only when `desconto > 0`, otherwise `formatarMoeda(0)`.
- `[route.ts:prestador]` Applies display fallbacks (`profissional?.razaoSocial || profissional?.name || "—"` and `"Não informado"`) and omits `"Inscrição municipal"` when `profissional?.inscricaoMunicipal` is falsy.
- `[route.ts:tomador]` Applies `"Não informado"` fallback for optional patient fields (`cpf`, `endereco`, `contato`, `email`).
- `[route.ts:servico]` Omits the `"Atendimentos"` row when `atribuicao.atendimentos` is falsy; maps `formaPagamento` and `periodicidade` via `formaPagamentoPlanoLabels` and `periodicidadePlanoLabels`.
- `[route.ts:STATUS_LABEL]` Maps installment statuses `PENDENTE` -> `"Pendente"` and `PAGO` -> `"Pago"` (falling back to raw `cobranca.status`), and defaults `cobranca.numeroParcela ?? 1` in `[route.ts:parcelas]`.
- `[route.ts:nomeArquivo]` Replaces whitespace in `paciente.nome` via `.replace(/\s+/g, "_")` to construct `Comprovante_<nome>.pdf`.

## Side Effects
- `[route.ts:atribuicao]` Queries Prisma `prisma.planoAtribuicao.findUnique({ where: { id }, include: { paciente: true, cobrancas: { orderBy: { vencimento: "asc" } } } })`.
- `[route.ts:profissional]` Queries Prisma `prisma.user.findUnique({ where: { id: session.user!.id! }, select: { name, razaoSocial, cpfCnpj, inscricaoMunicipal, telefone, endereco, email } })`.
- `[route.ts:buffer]` Renders PDF bytes in memory via `renderToBuffer(ComprovantePdfDocument(...))` with `geradoEm: formatarDataHora(new Date())`.
- `[route.ts:GET]` Streams `new Uint8Array(buffer)` with headers `Content-Type: application/pdf` and `Content-Disposition: inline; filename="${nomeArquivo}"` (no `Cache-Control` header or logging).

## Verification
- Run: `npm test`
