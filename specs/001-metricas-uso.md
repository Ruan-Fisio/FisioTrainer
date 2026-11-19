# 001 — Métricas de uso (`/metrics`)
Status: implementado

## Spec
### Problema
Não há visibilidade de como o sistema é usado (telas mais acessadas, planos mais vendidos, ações-chave). Pessoal interno precisa de um painel, fora do menu, alimentado por logs de uso próprios.

### Critérios de aceite
- **CA1** Dado usuário logado, quando navega por telas da clínica (`/(app)`), então cada page view é registrada com a rota-padrão (ex.: `/pacientes/[id]`), nunca com IDs.
- **CA2** Dado visitante sem sessão, quando abre `/compartilhado/*` ou `/pre-cadastro*`, então o acesso é registrado na área PORTAL / PRE_CADASTRO com rota-padrão, sem gravar o token. Token inválido cai no 404 raiz (fora do layout do portal) e não é contado.
- **CA3** Dado login bem-sucedido, quando a sessão é criada, então o evento `login` (`area=CLINICA`, `tipo=ACAO`) é registrado com o `usuarioId`.
- **CA4** Dado usuário logado, quando abre `/metrics`, então vê os blocos, cada um verificável:
  - **CA4a** Telas mais acessadas por área (top 10, com total).
  - **CA4b** Page views por dia (série).
  - **CA4c** Usuários ativos distintos (CLINICA).
  - **CA4d** Ações-chave: logins (de `UsoDiario`, sobrevivem à purga) + criações/alterações por módulo vindas do `AuditLog`.
  - **CA4e** Planos mais usados, por `planoNome`: atribuições criadas no período, ativas hoje (`status=ATIVO`, sem filtro de período) e atendimentos agendados no período (`Agendamento.dataInicio`, exceto cancelados).
  - **CA4f** Horário de pico (page views por hora, Brasília).
- **CA5** Dado `/metrics`, quando troca o período (7/30/90/365 dias), então a URL muda (`?dias=`, default 30) e os números refletem o período. Em 365 dias, usuários ativos (CA4c) e horário de pico (CA4f) só cobrem os últimos 90 dias e a tela avisa isso.
- **CA6** Dado sem sessão, quando abre `/metrics`, então vai para `/login`.
- **CA7** Dado o menu lateral e a navegação mobile, então não há link para `/metrics`.
- **CA8** Dado evento bruto com mais de 90 dias, então é apagado; `UsoDiario` permanece e sustenta os blocos CA4a/CA4b em períodos acima de 90 dias.
- **CA9** Dado falha ao gravar a métrica, então a navegação/ação real não é afetada.
- **CA10** Dado viewport de 375px, então os blocos viram cards empilhados, sem scroll horizontal.
- **CA11** Dado período sem dados, então cada bloco mostra estado vazio (não quebra nem exibe NaN). Coberto por teste unitário das funções puras de montagem, não por E2E (banco de teste nunca está vazio).

### Regras de negócio
- **RN1** Acesso: qualquer usuário logado (sem papel novo). `robots: noindex`. `/metrics` não conta a si mesma.
- **RN2** Rota-padrão por **tabela de segmentos estáticos conhecidos**: todo segmento fora da tabela vira `[id]`; query string e hash são descartados. Prefixo de topo desconhecido (`/api`, `/login`, 404 aleatório) é ignorado (evita cardinalidade lixo).
- **RN3** Sem PII: `usuarioId` só na área CLINICA; portal e pré-cadastro são anônimos. Nada de nome, token ou query string.
- **RN4** Planos mais usados vêm do banco (`PlanoAtribuicao`, `Agendamento`), sem log novo. Agrupa por `planoNome` (snapshot), então plano excluído continua aparecendo.
- **RN5** Criações vêm do `AuditLog` existente; só `login` é evento novo.
- **RN6** O endpoint de acesso é público por desenho. O servidor **deriva a área do pathname**, nunca de campo do body. CLINICA sem sessão é descartada (não rebaixada a PORTAL). Body limitado a poucos KB, resposta sempre 204 (sem eco).
- **RN7** Fuso: `UsoDiario.dia` = dia em Brasília (`toDateInputValue`) gravado como data pura (UTC meia-noite); horário de pico via `horaDoDia`; bordas de período via `datas-brasilia.ts`.
- **RN8** Agregado diário é incrementado de forma atômica (`INSERT ... ON CONFLICT DO UPDATE SET total = total + 1`), nunca `upsert` do Prisma (corrida em P2002).

### Fora de escopo
- Papéis/permissões, exportação CSV, alertas, user-agent/IP/geolocalização, tempo de permanência, funil detalhado do pré-cadastro, cron externo, limite de taxa por IP (ver Riscos).

## Plano
### Abordagem
Beacon client (`RastreadorAcesso`: `usePathname` + `fetch` com `keepalive`, dedupe pelo último pathname via `useRef`) nos layouts de `(app)`, `compartilhado` e `pre-cadastro`, que posta o pathname em `POST /api/metricas/acesso`. O handler normaliza a rota (lib pura), deriva a área, exige `auth()` só para CLINICA, grava `EventoUso` e incrementa `UsoDiario` via SQL atômico. `login` vem de `events.signIn` do NextAuth. `/metrics` é server component com consultas em `src/lib/metricas.ts`, período via URL (componente em `src/components/filters/`), `Suspense` + skeleton por bloco. Séries e rankings usam `UsoDiario` (barato, sobrevive à purga); usuários ativos e horário de pico usam `EventoUso`. A purga (`deleteMany` de brutos >90 dias, idempotente, coberta por índice em `criadoEm`) roda a cada abertura de `/metrics`, depois de responder (`after`). Prisma audit ignora os dois models novos, senão cada page view vira linha em `/logs`.

### Dados
Migration aditiva (sem backup obrigatório):
- Enums `AreaUso` (CLINICA|PORTAL|PRE_CADASTRO), `TipoUso` (TELA|ACAO).
- `EventoUso { id, criadoEm, area, tipo, chave, usuarioId? }` — índices `[criadoEm]`, `[area, tipo, chave]`. `usuarioId` sem FK (excluir usuário não cascateia nem bloqueia).
- `UsoDiario { id, dia @db.Date, area, tipo, chave, total Int }` — `@@unique([dia, area, tipo, chave])`.
- Fora de `MODULO_LABEL`: **excluídos** da auditoria (ignore em `src/lib/prisma.ts`, documentar em `docs/ops.md`).

### Arquivos
| Arquivo | Mudança | Cobre |
|---|---|---|
| `prisma/schema.prisma` + migration | models/enums | CA1–CA3, CA8 |
| `src/lib/metricas-rota.ts` (+ `.test.ts`) | `normalizarRota(pathname)` → `{area, chave} \| null` (exclui `/metrics`) | CA1, CA2, RN1–RN3, RN6 |
| `src/lib/metricas-periodo.ts` (+ `.test.ts`) | `parsePeriodo(dias)` (whitelist, default 30), `intervaloPeriodo`, `diaDaMetrica(date)`, `limitePurga(now)` | CA5, CA8, CA11, RN7 |
| `src/lib/metricas.ts` | `registrarEvento` (engole erro, SQL atômico), consultas dos blocos, `purgarAntigos` | CA3, CA4, CA8, CA9, RN4, RN5, RN8 |
| `src/app/api/metricas/acesso/route.ts` | POST: valida, deriva área, `auth()` se CLINICA, grava; 204 sempre | CA1, CA2, CA9, RN6 |
| `src/components/metricas/rastreador-acesso.tsx` | beacon com dedupe | CA1, CA2 |
| `src/app/(app)/layout.tsx`, `src/app/compartilhado/layout.tsx`, `src/app/pre-cadastro/layout.tsx` | montar rastreador (criar o layout se não existir) | CA1, CA2 |
| `src/lib/auth.ts` | `events.signIn` → `registrarEvento` | CA3 |
| `src/lib/prisma.ts` | ignorar `EventoUso`/`UsoDiario` na auditoria | CA9 |
| `src/app/(app)/metrics/page.tsx`, `loading.tsx`, `README.md`, `src/components/metricas/*` | painel responsivo, aviso do período, estados vazios | CA4–CA7, CA10, CA11 |
| `e2e/tests/metricas.spec.ts` | fluxo E2E | CA1–CA7, CA10 |
| `docs/metricas.md`, `CLAUDE.md` (índice), `docs/ops.md`, `src/app/api/metricas/README.md` | regras duráveis | — |

### Testes
- Unit `metricas-rota.test.ts` — `/pacientes/clx…/planos` → `/pacientes/[id]/planos`; token de `/compartilhado/paciente/<token>` → `[id]`; query/hash removidos; `/api`, `/login`, `/metrics`, prefixo desconhecido → `null`; área derivada do prefixo (CA1, CA2, RN2, RN3, RN6).
- Unit `metricas-periodo.test.ts` — `parsePeriodo` rejeita valor fora de 7/30/90/365 (default 30); `diaDaMetrica` com 23:30 Brasília (= 02:30 UTC do dia seguinte) cai no dia certo; `limitePurga` = agora − 90 dias; intervalos nas bordas do mês/ano (CA5, CA8, RN7).
- Unit `metricas-montagem.test.ts` — série/ranking/percentuais com total 0 e lista vazia, sem NaN (CA11).
- Unit `metricas.test.ts` (prisma mockado) — `registrarEvento` não lança quando o banco falha (CA9).
- E2E `metricas.spec.ts`:
  - Navegar por 2 telas → `/metrics` lista as rotas-padrão (CA1, CA4a).
  - Login com `storageState` vazio incrementa o total de logins (compara antes/depois) (CA3, CA4d).
  - Contexto sem sessão em `/pre-cadastro` e `/compartilhado/...` grava a rota sem token (CA2).
  - Trocar período altera `?dias=` e mostra o aviso em 365 (CA5).
  - Plano atribuído aparece em planos mais usados (CA4e).
  - Evento bruto antigo (inserido via `e2e/test-db.ts`) é purgado e o agregado permanece; verificação com `expect.poll`, pois a purga roda em `after` (CA8).
  - Sidebar e MobileNav sem link `/metrics` (CA7).
  - Sem sessão → `/login` (CA6).
  - Viewport 375px sem scroll horizontal (CA10).

### Riscos
- Volume: 1 insert + 1 upsert SQL por page view; ok para clínica pequena, avaliar amostragem se crescer.
- Endpoint público pode ser inflado por terceiros (afeta só a métrica); mitigado por allowlist de prefixos, body mínimo e dedupe. Limite de taxa por IP fica de fora de propósito (exigiria escrita extra por request); revisar se houver abuso.
- React Strict Mode dispara o efeito 2x em dev; o dedupe por `useRef` evita contagem dupla.
- Esquecer de excluir os models da auditoria polui `/logs` (T4).
- `events.signIn` só pode ficar em `auth.ts`; importar `metricas.ts` no `auth.config.ts` (edge) quebra o proxy.
- `$executeRaw` com enums do Prisma exige cast explícito (`::"AreaUso"`); coberto no E2E.

## Tarefas
- [x] T1 Adicionar enums e models `EventoUso`/`UsoDiario` + migration escrita à mão (validar com `prisma validate`/`generate`; aplicada pelo `npm run dev`/E2E via `migrate deploy`, sem `migrate dev`) — `prisma/schema.prisma` (CA1–CA3, CA8)
- [x] T2 Criar `normalizarRota` + testes — `src/lib/metricas-rota.ts` (CA1, CA2)
- [x] T3 Criar helpers de período/dia/purga + testes — `src/lib/metricas-periodo.ts` (CA5, CA8, CA11)
- [x] T4 Excluir os novos models da auditoria — `src/lib/prisma.ts` (CA9)
- [x] T5 `registrarEvento` (SQL atômico, engole erro) + teste — `src/lib/metricas.ts` (CA3, CA9, RN8)
- [x] T6 Route handler de acesso — `src/app/api/metricas/acesso/route.ts` (CA1, CA2, RN6)
- [x] T7 Evento `login` via `events.signIn` — `src/lib/auth.ts` (CA3)
- [x] T8 `RastreadorAcesso` nos 3 layouts (CA1, CA2)
- [x] T9 Consultas dos blocos e `purgarAntigos` — `src/lib/metricas.ts` (CA4, CA8, CA11)
- [x] T10 Página `/metrics` com filtro de período, blocos responsivos, estados vazios, sem link no menu (CA4–CA7, CA10, CA11)
- [x] T11 E2E `metricas.spec.ts` (CA1–CA8, CA10, CA11)
- [x] T12 Verificar: `npm test`, `npx tsc --noEmit`, `npx next build`
- [x] T13 Criar `docs/metricas.md`, linha no índice do `CLAUDE.md`, nota em `docs/ops.md` e READMEs das pastas novas
