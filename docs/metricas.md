# Métricas de uso (`/metrics`)

Painel **interno** de uso do sistema. Sem link no menu/navegação mobile; qualquer usuário logado abre (o proxy redireciona quem não tem sessão); `robots: noindex`. Spec: `specs/001-metricas-uso.md`.

## Coleta
- `RastreadorAcesso` (`src/components/metricas/`) nos layouts de `(app)`, `compartilhado` e `pre-cadastro` envia **só o pathname** (`POST /api/metricas/acesso`) a cada mudança de rota (dedupe por `useRef`).
- O servidor normaliza (`src/lib/metricas-rota.ts`) por **tabela de segmentos estáticos**: o que não está na tabela vira `[id]`; query/hash caem; prefixo de topo desconhecido (`/api`, `/login`, `/metrics`) é ignorado. **Rota nova com segmento estático novo → adicionar em `SEGMENTOS_ESTATICOS`/`TOPOS_CLINICA`** (senão vira `[id]`/some).
- A **área é derivada do pathname no servidor**, nunca do body. CLINICA sem sessão é descartada (não rebaixada). Resposta sempre 204; falha de métrica nunca afeta a navegação.
- `login`: `events.signIn` em `src/lib/auth.ts` (`area=CLINICA, tipo=ACAO, chave=login`). **Nunca** importar `metricas.ts` em `auth.config.ts` (edge/proxy).
- Sem PII: `usuarioId` só na área CLINICA; portal/pré-cadastro anônimos; token nunca é gravado. Token inválido cai no 404 raiz (fora do layout do portal) e não conta.

## Dados
- `EventoUso` (bruto, **apagado após 90 dias** por `purgarAntigos`, chamada em `after()` a cada abertura de `/metrics`) e `UsoDiario` (agregado por dia/área/tipo/chave, permanece).
- O agregado é incrementado por SQL atômico (`INSERT ... ON CONFLICT DO UPDATE SET total = total + 1`) — nunca `upsert` do Prisma (corrida). `dia` = dia de Brasília como data pura (`diaDaMetrica`).
- **Fora da auditoria** (`src/lib/prisma.ts`): escrever 1 linha por page view em `AuditLog` poluiria `/logs`. Model novo de métrica → também ignorar lá.

## Painel
- Período `?dias=` ∈ {7, 30, 90, 365} (default 30, `parsePeriodo`). Séries e rankings usam `UsoDiario` (valem em 365 dias); **usuários ativos e horário de pico** usam `EventoUso` e só cobrem 90 dias (a tela avisa em 365).
- Ações-chave: logins (`UsoDiario`) + criações/alterações por módulo (`AuditLog`). Planos mais usados vêm do banco (`PlanoAtribuicao`/`Agendamento`, agrupados por `planoNome`): atribuições criadas no período, ativas hoje, atendimentos no período (exceto cancelados).
- Montagem pura e sem NaN em `src/lib/metricas-montagem.ts`; consultas em `src/lib/metricas.ts`.

## Testes
`metricas-rota`, `metricas-periodo`, `metricas-montagem`, `metricas` (unit) e `e2e/tests/metricas.spec.ts`.
