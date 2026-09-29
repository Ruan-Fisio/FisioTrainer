# FisioTrainer

Aplicação fullstack para um fisioterapeuta gerenciar sua clínica: usuários, biblioteca de exercícios, exames, pacientes, planos/financeiro, agenda e portal público do paciente.

## Como usar este arquivo

Este `CLAUDE.md` é só um **índice + regras críticas** (mantê-lo em ~100 linhas). O detalhe de cada área fica em `docs/*.md` — **leia o doc da área antes de mexer nela**, não carregue tudo.

- **Ao receber uma diretriz importante do usuário**: registre-a no `docs/` da área (não aqui). Aqui só entra se for uma regra transversal curta (1–2 linhas) ou um novo link de índice.
- **Não registrar aqui** histórico de bugs, passo a passo de implementação ou detalhes que o código já mostra.

## Stack

- **Next.js 16** (App Router, Turbopack) · **Prisma 7** + Neon Postgres (`@prisma/adapter-pg`) · **NextAuth v5** (Credentials + JWT) · **Tailwind v4** + shadcn/ui · **date-fns + date-fns-tz** · vitest · Playwright.
- Auth dividida: `src/lib/auth.config.ts` (edge-safe, usada por `src/proxy.ts`) e `src/lib/auth.ts` (com Prisma). **Nunca importar `auth.ts` no proxy/middleware.**
- Arquivo `"use server"` só exporta funções `async` — lógica pura/compartilhada vai para `src/lib/`.

## Índice de docs

| Área | Doc |
|---|---|
| Testes unitários (vitest) e E2E (Playwright, banco `fisiotrainer_test`) | `docs/testes.md` |
| Convenção de CRUD, filtros via URL, design system, acessibilidade, responsividade, abas | `docs/ui-padroes.md` |
| Exames: MULTIPLA_ESCOLHA, CALCULADO, opções automáticas, Exame Sombra | `docs/exames.md` |
| Agenda (só leitura), salas, sala por plano, serviços avulsos, modalidades do usuário, funcionamento/feriados | `docs/agenda-salas-servicos.md` |
| Agendamento assistido, grade recorrente, planos, parcelamento, renovação | `docs/agendamento-planos.md` |
| Dashboard (compromissos, financeiro), portal público (`/compartilhado`), desmarcar, créditos de remarcação | `docs/dashboard-portal.md` |
| Fuso horário / datas (LEIA antes de tocar em qualquer `Date`) | `docs/fuso-horario.md` |
| Auditoria (`/logs`), backup antes de operação destrutiva, seed | `docs/ops.md` |

## Regras críticas (valem sempre)

**Backend e testes**
- Toda lógica de backend não-trivial (datas/fuso, geração de registros, parsing, limites, diffs, zod com refine) precisa de teste unitário **na mesma alteração**: lógica pura em `src/lib/<x>.ts` + `<x>.test.ts`.
- Antes de dar tarefa de backend como pronta: `npm test`, `npx tsc --noEmit`, `npx next build`. Nunca `.skip`/apagar teste quebrado por atalho; mudou comportamento de propósito → atualiza o teste junto.
- Todo fluxo de tela crítico novo ganha spec E2E (`e2e/`). **Nunca apontar a suíte E2E para o banco de dev.**

**Banco**
- Antes de qualquer operação destrutiva (migration com DROP, `migrate reset`, UPDATE/DELETE em massa, restauração): `pg_dump` do banco alvo em `backups/` (gitignored). Em produção, rodar `prisma migrate status` antes. Comando exato em `docs/ops.md`.
- Toda escrita no Prisma é auditada automaticamente; model novo → adicionar em `MODULO_LABEL` (`src/lib/audit.ts`).

**Datas e fuso (America/Sao_Paulo)**
- Proibido `getHours/getDate/getMonth`, `toLocale*String`, `new Intl.DateTimeFormat`, `startOfDay` etc. em instante real, e `new Date("...")` sem offset. O lint bloqueia formatação crua.
- Exibição: helpers de `src/lib/format.ts`. Bordas de dia/semana/mês: `src/lib/datas-brasilia.ts`. Entrada de form: `combinarDataHora`. Faltou helper → adicione em `format.ts`.

**UI**
- Filtros de listagem: a URL é a única fonte da verdade (`list(filters, page)`, componentes em `src/components/filters/`); listagem usa `Suspense` + `TableSkeleton`.
- Botão que avança/confirma à **direita**, cancelar/voltar à **esquerda**; ações de form via `FormActions`.
- Todo input/select/textarea tem `<Label>` visível associado (nunca só placeholder).
- Toda tela é responsiva: listagens = cards em mobile / tabela em desktop; abas sem scroll horizontal (grade de botões em mobile); testar em ~375px.
- Design: profundidade por camadas (`Card` já traz sombra/ring), gradientes sutis, cores de marca (`--primary` azul, laranja só como destaque pontual). Logo nunca quadrado nem com `rounded-*`.

**Domínio**
- `Agendamento` de Fisio/EF sempre resolve sala via `PlanoSala` (nunca cria sem sala); capacidade por paciente; uma sala nunca atende Fisio e EF ao mesmo tempo. Limite do plano tem dois tetos (total do período + mensal), checados no client e no server.
- Profissional de Fisio/EF é filtrado por `User.atendeFisioterapia/atendeEducacaoFisica` — validar também no server.
- `/agenda` é **só visualização**; criar/remarcar/alterar acontece na aba Agendamentos do paciente ou no dashboard.
- Exames: nunca `split(",")`/`join(",")` em MULTIPLA_ESCOLHA (usar `src/lib/multipla-escolha.ts`); CALCULADO nunca é gravado, sempre recalculado (`src/lib/exame-formula.ts`).
- Plano: nota fiscal sempre inclusa; mensal nunca parcela (exceto estendido em plano híbrido); trimestral até 3x.
- Portal público: navegação lista → detalhe; seleção dentro de aba usa `useState`, nunca query param; o paciente **nunca** vê saldo de créditos de remarcação.
- Cache local de client (mês/aba) que depende de dado mutável em outro lugar precisa ser invalidado quando a prop do server muda — `router.refresh()` sozinho não basta.

## Seed e acesso local

`npm run db:seed` (idempotente): admin `admin@admin.com` / `admin`, Sala 1 - Cinesioterapia, dias de funcionamento, grade de horários EF/Fisio. Paciente de teste manual: Guilherme Mataveli.
