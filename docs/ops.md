# Auditoria, backups e seed

## Operações destrutivas — sempre fazer backup antes

Antes de rodar qualquer operação destrutiva ou de risco em um banco (local ou produção) — `prisma migrate dev`/`deploy` que faça `DROP TABLE`/`DROP COLUMN`, `migrate reset`, edição manual de dados via `psql`/`DELETE`/`UPDATE` em massa, ou qualquer restauração/sobrescrita de dados — faça um dump do banco alvo **antes** de executar a operação:

```bash
docker exec fisiotrainer-postgres pg_dump -U fisiotrainer -d fisiotrainer --no-owner --no-privileges -F c -f /tmp/backup_<contexto>_<timestamp>.dump
docker cp fisiotrainer-postgres:/tmp/backup_<contexto>_<timestamp>.dump "backups/backup_<contexto>_<timestamp>.dump"
```

Para o banco de produção (Neon), usar `pg_dump` apontando para a `DATABASE_URL` de produção em vez de `-U fisiotrainer -d fisiotrainer`. A pasta `backups/` já está no `.gitignore` (contém dados sensíveis de pacientes) — nunca versionar esses dumps.

Isso vale mesmo quando o usuário autoriza explicitamente a operação destrutiva: o backup é a rede de segurança, não um pedido de permissão extra. Antes de rodar `prisma migrate dev`/`deploy` contra produção, também rodar `prisma migrate status` primeiro para saber exatamente quais migrations serão aplicadas e se alguma delas dá `DROP`/`ALTER` destrutivo (aparece como aviso no output do Prisma).

## Observabilidade — trilha de auditoria (tela /logs)

Toda operação de **escrita** (create/update/upsert/delete e variantes `*Many`) em qualquer model é registrada automaticamente na tabela `AuditLog` — **não há chamada manual em server action**. A captura é uma extensão do Prisma Client (`base.$extends({ query: { $allModels: { $allOperations } } })` em `src/lib/prisma.ts`):

- Grava `modulo` (nome do model), `acao` (operação), `registroId`, `resumo` (rótulo pt-BR + nome/título do registro quando dá pra inferir), `dados` (JSON com `data`/`where`/`create`/`update` sanitizados — `password` vira `[oculto]`, strings e arrays truncados, `Decimal`→número, `Date`→ISO) e `usuarioId`/`usuarioNome`.
- **Usuário**: `usuarioAtual` faz `import("@/lib/auth")` dinâmico (evita ciclo, já que `auth.ts` importa `prisma.ts`) embrulhado em `cache()` do React (dedupe por request, não decodifica o JWT a cada query). Fora de request (seed/script) cai em `null` = "Sistema".
- Em `delete` de registro único, busca o estado anterior (`findUnique`) antes de apagar, pra guardar em `dados.registro`.
- O log **nunca quebra a operação real** (`void registrar(...).catch(() => {})`); e `model === "AuditLog"` é ignorado (sem recursão — além disso a escrita do log usa o client base, sem extensão).
- Rótulos pt-BR de model/ação em `src/lib/audit.ts` (`MODULO_LABEL`, `ACAO_LABEL`). Model novo → adicionar em `MODULO_LABEL` (senão aparece com o nome cru).
- **Ficam fora da auditoria**, por serem escritos a cada request: `ExameEdicaoPresenca`, `LimiteTentativa`, `EventoUso` e `UsoDiario` (ver `docs/metricas.md`). Model de alto volume novo → adicionar ao ignore em `src/lib/prisma.ts`.
- Desligar em ambiente específico: `AUDIT_LOG=off`.
- Tela `/logs` (última no menu): filtros por texto / módulo / ação / intervalo de datas (padrão de filtros da URL), paginação, e "Detalhes" abre o JSON de `dados`.

## Exclusão de paciente é lógica (decisão do usuário)

`deletePaciente` só preenche `Paciente.excluidoEm`: **nada é apagado**, nem no banco nem no R2. Não usar `paciente.delete`. Regras em `src/lib/paciente-exclusao.ts`.

- **Na exclusão**: agendamentos futuros `AGENDADO` são cancelados (em grupo, só tira esse paciente), a grade é desativada, os links do portal são revogados e contratos pendentes são cancelados.
- **Toda listagem geral nova** precisa filtrar: `paciente: PACIENTE_ATIVO`; em `Agendamento`, `AGENDAMENTO_VISIVEL` (já incluído em `whereFiltrosComuns`). As telas `/pacientes/[id]/*` são protegidas pelo `layout.tsx` da rota.
- **Continuam visíveis de propósito**: contratos em `/contratos` e cobranças `PAGO` na receita do dashboard (dinheiro recebido não deixa de ter existido).
- **Restaurar** (`/pacientes?excluidos=1`) traz cadastro e histórico; grade, link do portal e contrato pendente a clínica refaz. O CPF continua único entre excluídos, por isso cadastrar o mesmo CPF orienta a restaurar.

## Seed

`npm run db:seed` (idempotente, via `upsert`) cria: usuário admin padrão (`admin@admin.com` / `admin`), a Sala 1 - Cinesioterapia, dias de funcionamento (segunda a sábado), e uma **grade padrão de horários fixos** (07:00–16:00, de hora em hora com intervalo de almoço) pra Educação Física e Fisioterapia — sem isso um banco novo não materializa nenhum agendamento de plano (grade recorrente e wizard de agendamento exigem ≥1 horário ativo por modalidade). Reusado tal qual pela suíte E2E (`e2e/scripts/reset-test-db.ts`) pra montar o banco de teste do zero a cada rodada.

## R2 (imagens de exame)

Após definir as envs de R2, rode uma vez por ambiente: `npx tsx scripts/r2-setup.ts [origens,separadas,por,virgula]` — cria o bucket se faltar, aplica o CORS (PUT/GET) para o upload direto do navegador e a expiração de 1 dia do prefixo `tmp/`. Em produção passe a URL do site, ou `"*"` (qualquer origem — seguro: a autorização do envio é a assinatura da URL, não a origem). **CORS precisa de `AllowedHeaders: ["*"]`** (o PUT manda `Content-Type`); regra editada à mão no painel da Cloudflare sem isso quebra o upload com erro de CORS.

## Rodar o build de produção localmente (Docker)

`docker compose up -d --build` sobe o Postgres local e o app (`Dockerfile`: `next build` + `next start`) em http://localhost:3000. O container `app` sempre usa o Postgres do compose — o `DATABASE_URL` do `.env` é sobrescrito, então nunca toca o Neon. Os outros segredos (AUTH_SECRET, R2) vêm do `.env`; uploads vão para o bucket R2 real. Rebuild após mudar código: `docker compose up -d --build app`.
