# Testes (unitários e E2E)

## Testes unitários (obrigatório para lógica de backend)

Toda função de backend com lógica não-trivial (cálculo de datas/fuso, geração/materialização de registros, parsing/serialização, regras de limite/orçamento, diffs, validações zod com refine) **precisa** de teste unitário junto com a implementação — não deixar "pra depois". Bugs reais desta base (grade materializando no mês errado, comparação de `slotData` com fuso trocado, janela de cobertura) teriam sido pegos por um teste.

- Extraia a lógica pura para um módulo testável (`src/lib/<x>.ts`) e teste com `vitest` em `src/lib/<x>.test.ts` — os testes rodam sem banco e com `TZ` qualquer. Ver `datas-brasilia.test.ts`, `grade-recorrente.test.ts`, `multipla-escolha.test.ts` como referência.
- Server actions que dependem de Prisma: extraia a parte pura (o que dá pra testar sem I/O) e cubra os casos de borda dela; o fluxo com banco é verificado por smoke manual.
- **Rodar `npm test` (= `vitest run`) antes de considerar qualquer tarefa de backend pronta.** Junto com `npx tsc --noEmit` e `npx next build`.
- Cobrir sempre: virada de mês/ano, fuso de Brasília vs. UTC, entrada vazia/nula, e o cenário de regressão que motivou a mudança.
- **Manter os testes atualizados**: sempre que a lógica ou a tela coberta por um teste mudar de comportamento de propósito, o teste correspondente é atualizado **na mesma alteração** — nunca deixar passar por coincidência, nunca comentar/pular (`.skip`) um teste quebrado como atalho pra "terminar logo". Um teste vermelho depois de uma mudança intencional é sinal pra revisar o teste (ele ainda descreve o comportamento certo?), não pra ignorá-lo ou apagá-lo sem entender por quê.

## Testes E2E (Playwright)

Suíte de ponta a ponta em `e2e/`, rodando o app de verdade num navegador (Chromium). Existe porque bugs reais desta base (janela da grade recorrente cortando cedo, cache de mês desatualizado na aba Agendamentos) só apareciam testando manualmente no navegador — nenhum teste unitário cobria o fluxo de tela inteiro.

- **Banco isolado, nunca o de dev**: os specs rodam contra `fisiotrainer_test` (mesmo container Docker `fisiotrainer-postgres`, banco separado) — configurável via `DATABASE_URL_TEST` no `.env`, com fallback pro banco local padrão (`e2e/test-db.ts`). **Nunca aponte a suíte pro banco de dev** (`fisiotrainer`) — ela cria/edita registros livremente e vai colidir com o que você navega manualmente (ex. o paciente de teste Guilherme Mataveli).
- `npm run test:e2e` (headless) / `npm run test:e2e:ui` (interativo). O `globalSetup` (`e2e/global-setup.ts` → `e2e/scripts/reset-test-db.ts`) cria o banco de teste se não existir, aplica todas as migrations e roda `prisma/seed.ts` (idempotente) — sempre antes da suíte, sem passo manual.
- Sobe um `next dev` próprio na **porta 3100** (não a 3000 do seu `npm run dev`), com `distDir` isolado (`NEXT_DIST_DIR=.next-e2e` em `next.config.ts`) — sem isso o Next 16 recusa subir um 2º dev server pro mesmo projeto. Playwright derruba esse servidor sozinho ao terminar (a não ser que já tivesse um rodando na 3100).
- **Login uma vez só**: projeto `setup` (`e2e/tests/auth.setup.ts`) loga como admin pela UI e salva a sessão em `e2e/.auth/admin.json` (gitignored); o projeto `chromium` reusa esse `storageState` — specs não precisam logar de novo, a não ser que estejam testando o próprio login/logout (aí usam `test.use({ storageState: { cookies: [], origins: [] } })`, ver `auth.spec.ts`).
- **Dados por spec**: config de base (salas, horários, dias de funcionamento, admin) vem do seed; cada spec cria suas próprias entidades de negócio (paciente, plano, usuário) com nome único por execução — o banco de teste é descartável, resetado a cada rodada, sem precisar de teardown manual. Helpers reusáveis em `e2e/fixtures/`.
- **Todo fluxo de tela crítico novo** (wizard, CRUD, regra de negócio visível na UI) ganha um spec E2E junto com a implementação — mesmo espírito da regra de teste unitário acima, aplicada à camada de tela.

