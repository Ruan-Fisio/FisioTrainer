# FisioTrainer

Aplicação fullstack para um fisioterapeuta gerenciar sua clínica (usuários, biblioteca de exercícios, e módulos futuros: pacientes, consultas, agenda).

## Instruções para o Claude

Sempre que o usuário passar uma diretriz importante durante uma conversa (uma regra de negócio, um padrão de UI/UX, uma convenção de código que deve valer daqui pra frente), registrar essa diretriz neste arquivo na seção mais relevante, não só aplicar na tarefa da vez.

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

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Prisma 7** + **Neon Postgres** (driver adapter `@prisma/adapter-pg`, obrigatório desde o Prisma 7)
- **NextAuth v5** (Credentials + JWT). Config dividida em `src/lib/auth.config.ts` (edge-safe, usada pelo `src/proxy.ts`) e `src/lib/auth.ts` (completa, com Prisma — nunca importar `auth.ts` no proxy/middleware, quebra o Edge Runtime)
- **Tailwind v4** + **shadcn/ui** (Radix)

## Convenção de módulo CRUD

Cada entidade segue a mesma estrutura (ver `usuarios`, `categorias`, `exercicios` como referência):

- `src/lib/validations/<entidade>.ts` — schema zod
- `src/actions/<entidade>s.ts` — server actions: `list<Entidade>s(filters, page)`, `create<Entidade>`, `update<Entidade>` (assinatura `(id, prevState, formData)`, usado via `.bind(null, id)`), `delete<Entidade>`
- `src/components/<entidade>s/` — `<entidade>s-table.tsx` (server component, cards em mobile / tabela em desktop), `<entidade>-form.tsx` (client, `useActionState`), `<entidade>-row-actions.tsx` (editar + excluir com `Dialog` de confirmação)
- `src/app/(app)/<rota>/{page,loading,novo/page,[id]/page}.tsx`

## Padrão de filtros (obrigatório em toda tela de listagem)

A URL é a única fonte da verdade dos filtros — nunca guardar filtro em `useState` isolado do componente de filtro. Isso torna toda listagem bookmarkable/compartilhável e mantém o padrão escalável conforme novos filtros são adicionados.

- **Server**: a `page.tsx` (server component) lê `searchParams`, monta um objeto de filtros tipado e passa para a server action de listagem — nunca parâmetros soltos (`list(page, search)`), sempre `list(filters: {...}, page)`.
- **Client**: componentes de filtro em `src/components/filters/` só leem/escrevem a URL (`router.push`), nunca guardam o resultado filtrado:
  - `search-input.tsx` — busca textual com debounce, prop `paramName` (default `"q"`)
  - `multi-select-filter.tsx` — filtro multi-seleção (Popover + Command), serializa a seleção como CSV num query param (`?categorias=id1,id2`)
  - `pagination-controls.tsx` — paginação genérica via `?page=`
- `src/lib/search-params.ts` — helpers puros `parseListParam` / `buildListParam` para (de)serializar listas de IDs em CSV; usar tanto no client (filtros) quanto no server (parse do `searchParams` na page).
- Toda mudança de filtro reseta `page` para 1 (os componentes de filtro já fazem isso).
- Toda listagem usa `Suspense` com `key` derivada dos filtros + `loading.tsx` da rota, mostrando `TableSkeleton` (`src/components/skeletons/table-skeleton.tsx`) enquanto carrega.

**Ao adicionar um novo filtro por característica de uma entidade** (ex. filtrar pacientes por status, consultas por data): reutilize `SearchInput`/`MultiSelectFilter` existentes ou crie um novo componente em `src/components/filters/` seguindo o mesmo contrato (lê `useSearchParams`, escreve via `router.push`, nunca duplica estado).

## Padrão de ações em formulários

Em qualquer par de botões de ação (salvar/cancelar, confirmar/voltar), o botão que **avança/confirma** (submit, "Criar X", "Salvar alterações") fica à **direita**, e o botão que **recua/cancela** ("Cancelar", "Voltar") fica à **esquerda** — use `className="flex justify-end gap-2"` no container e coloque o botão de cancelar antes do botão de submit no JSX.

## Design system / UI

A aplicação usa um visual "moderno com profundidade", não flat. Ao criar ou alterar telas, seguir:

- **Profundidade via camadas, não via cor chapada**: fundo da página (`bg-muted/30` no shell logado) diferente do fundo dos cards (`bg-card`), que por sua vez usam `shadow-sm shadow-black/5` + `ring-1 ring-foreground/10` (já embutido no componente `Card` — não remover nem duplicar sombra manualmente).
- **Gradientes sutis de marca em vez de blocos sólidos**: sidebar e o `Sheet` do menu mobile usam um `linear-gradient` leve sobre `--sidebar` (via `style`, com `color-mix(in oklch, var(--sidebar), white/black N%)`) em vez de cor plana. Telas de destaque (login, header do app) usam um `radial-gradient` bem sutil (6–18% de opacidade) com `var(--primary)`/`var(--sidebar-primary)` posicionado nos cantos, nunca cobrindo o conteúdo.
- **Header sticky com blur**: `sticky top-0 z-10 bg-background/80 backdrop-blur-md shadow-sm` — não deixar o header "grudado" sem transparência/blur.
- **Item ativo de navegação** tem `shadow-sm` além do `bg-sidebar-accent`, para não ficar só uma mudança de cor.
- **Botão primário** tem `shadow-sm shadow-primary/20` (definido em `buttonVariants`, variant `default`) — reforça que é a ação principal da tela.
- **Logo** (`public/logo.png`) é retangular (proporção real ~523×342, transparente) — sempre renderizar com `width`/`height` reais da imagem e `h-auto w-[Npx] object-contain`, nunca forçar quadrado (`size-N`) nem usar `rounded-*` nela.
- **Cores de marca**: `--primary` (azul, `#1d3b86`) para ações/foco; `--sidebar-primary`/`--accent` (laranja, `#f19c09`) como destaque pontual (ícone ativo, hover), nunca como cor de fundo dominante.
- Ao usar `color-mix(in oklch, ...)` inline via `style` (Tailwind v4 não tem utilitário nativo pra isso ainda), preferir isso a hardcode de hex — mantém consistência com dark mode automaticamente, já que lê a custom property do tema.

## Acessibilidade de formulários (obrigatório)

Todo input, select e textarea de formulário precisa ter um `<Label>` associado (via `htmlFor`/`id`) — nunca depender só de `placeholder` como identificação do campo, porque o placeholder some assim que o campo é preenchido e o usuário perde a referência do que está editando.

- **Label visível é o padrão**, mesmo para campos curtos lado a lado num grid (ex. séries/repetições/carga/descanso de um exercício de treino) — nesse caso usar `<Label className="text-xs">` acima do campo, não `sr-only`.
- `<Label className="sr-only">` só é aceitável quando o campo já é identificável de forma inequívoca por outro elemento visível ao lado (ex. um ícone de busca com única função óbvia) — na dúvida, deixar o label visível.

## Responsividade (obrigatório em toda tela)

Todo o sistema deve ser responsivo para mobile — não só as telas de listagem. Ao criar ou alterar qualquer tela:

- **Listagens**: cards empilhados em mobile (`flex flex-col gap-3 md:hidden`) / tabela em desktop (`hidden md:block`), como em `categorias-table.tsx`. Nunca deixar só a tabela com scroll horizontal como única opção em telas pequenas.
- **Formulários**: campos empilhados em coluna única por padrão (`flex flex-col gap-4`), grids de campos relacionados usam `grid-cols-1 sm:grid-cols-N` (nunca fixar múltiplas colunas abaixo do breakpoint `sm`). Ações de salvar/cancelar usam o componente `FormActions` (`src/components/ui/form-actions.tsx`), que já resolve o padrão mobile (FAB fixo) vs. desktop (barra fixa no rodapé) — não reimplementar isso na mão.
- **Cabeçalhos de página**: `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`, título/descrição empilhados sobre o botão de ação em mobile.
- **Abas** (`Tabs`/`TabsList`): **nada de scroll horizontal em mobile**. Padrão de `paciente-tabs.tsx`: em mobile (`md:hidden`) uma grade de botões (`grid grid-cols-2 sm:grid-cols-3 gap-1.5 rounded-lg bg-muted p-1.5`) que quebra em linhas, item ativo com `bg-background shadow-sm ring-1 ring-foreground/10`; em desktop (`hidden md:block`) a `TabsList` tradicional. O `Tabs` continua sendo o container controlado (via `?tab=` na URL) — os dois controles chamam o mesmo `onValueChange`. Cada aba tem um `icon?: ReactNode` (lucide) renderizado antes do label nos dois modos, com o ícone da aba ativa em `text-sidebar-primary` (laranja de destaque).
- Testar toda tela nova/alterada num viewport mobile (largura ~375px) antes de considerar pronta, não só no desktop.

## Campos MULTIPLA_ESCOLHA (exames) — nunca serializar seleção com vírgula

O texto das opções de uma coluna `MULTIPLA_ESCOLHA` (ex. "Positivo = Reprodução da dor, irradiação ou fraqueza") é livre e pode conter vírgula. Um bug real: no formulário de execução de exame, a seleção (única ou múltipla) era serializada/comparada com `valor.split(",")`/`.join(",")`, então uma opção com vírgula no próprio texto quebrava o parse e nunca aparecia marcada (o radio "Positivo" não marcava, só "Negativo", que não tinha vírgula).

- Use sempre `src/lib/multipla-escolha.ts` (`parseSelecionadas`, `serializeSelecionadas`, `toggleSelecionada`) para ler/gravar o valor de colunas `MULTIPLA_ESCOLHA` com `multiplaSelecao: true` — nunca `split(",")`/`join(",")` direto.
- Para seleção única (`multiplaSelecao: false`), o valor é a própria string da opção — compare com `valorAtual === opcao`, nunca quebre por vírgula.
- Testes de regressão para esses edge cases (opção com vírgula, dado legado sem o novo delimitador, roundtrip) estão em `src/lib/multipla-escolha.test.ts`. Rodar com `npm test`.

## Operações destrutivas — sempre fazer backup antes

Antes de rodar qualquer operação destrutiva ou de risco em um banco (local ou produção) — `prisma migrate dev`/`deploy` que faça `DROP TABLE`/`DROP COLUMN`, `migrate reset`, edição manual de dados via `psql`/`DELETE`/`UPDATE` em massa, ou qualquer restauração/sobrescrita de dados — faça um dump do banco alvo **antes** de executar a operação:

```bash
docker exec fisiotrainer-postgres pg_dump -U fisiotrainer -d fisiotrainer --no-owner --no-privileges -F c -f /tmp/backup_<contexto>_<timestamp>.dump
docker cp fisiotrainer-postgres:/tmp/backup_<contexto>_<timestamp>.dump "backups/backup_<contexto>_<timestamp>.dump"
```

Para o banco de produção (Neon), usar `pg_dump` apontando para a `DATABASE_URL` de produção em vez de `-U fisiotrainer -d fisiotrainer`. A pasta `backups/` já está no `.gitignore` (contém dados sensíveis de pacientes) — nunca versionar esses dumps.

Isso vale mesmo quando o usuário autoriza explicitamente a operação destrutiva: o backup é a rede de segurança, não um pedido de permissão extra. Antes de rodar `prisma migrate dev`/`deploy` contra produção, também rodar `prisma migrate status` primeiro para saber exatamente quais migrations serão aplicadas e se alguma delas dá `DROP`/`ALTER` destrutivo (aparece como aviso no output do Prisma).

## Usuários — modalidades de atendimento

`User.atendeFisioterapia` / `User.atendeEducacaoFisica` (dois booleans, default `false`, editáveis no form de usuário na seção "Modalidades de atendimento") definem em quais modalidades o usuário pode ser escolhido como profissional na agenda. Serve pra separar profissional / estagiário / etc. por área.

- **Filtro de profissional é obrigatório**: em qualquer seletor de "Profissional" cuja modalidade seja `FISIOTERAPIA` ou `EDUCACAO_FISICA`, listar só usuários com o boolean correspondente. `AVALIACAO` e `TERAPIA_MANUAL` não filtram. Aplicado no wizard `agendamento-assistido-dialog.tsx` (tela do paciente + portal compartilhado; o `<select>` de profissional só habilita depois do plano/modalidade) e no editor de grade (`grade-section.tsx`).
- **O filtro do client não basta — validar também no server**: `validarProfissionalModalidade(profissionalId, modalidade)` (`src/lib/agendamento-checagens.ts`) roda em `criarAgendamentoAssistido` e na materialização da grade. Retorna erro se o usuário não tem o boolean da modalidade.
- Toda query que carrega `profissionais` pra esses formulários precisa selecionar `atendeFisioterapia` / `atendeEducacaoFisica` (ver `agenda/novo`, `agenda/[id]/editar`, `getDadosAgendamentoAssistido`).
- A tabela de usuários (`usuarios-table.tsx`) mostra as modalidades como badges (Fisioterapia = azul/primary, Educação Física = âmbar).

## Agenda — salas e modalidades

> **Diretriz:** a tela `/agenda` é **só visualização**. Não existe criar/editar/remarcar/excluir por lá — sem botão "Novo evento", sem clicar em célula/horário para criar, e o `EventoChip` abre um diálogo **só com os detalhes**. As rotas `/agenda/novo` e `/agenda/[id]/editar`, o `agendamento-form.tsx`, o `agendamento-row-actions.tsx` e as actions `createAgendamento`/`updateAgendamento`/`deleteAgendamento`/`getAgendamento` **foram removidos**. Toda criação/alteração acontece na **aba Agendamentos do paciente** (clínica ou portal) ou no **dashboard** (`RemarcarDialog` + Compareceu/Faltou continuam lá).
>
> **Ainda pendente** (próxima rodada): tornar `planoAtribuicaoId` obrigatório em todo `Agendamento` e parar de gerar agendamento para `AVALIACAO`/`TERAPIA_MANUAL` (avaliação é integrada ao plano — o paciente marca EF ou Fisioterapia para fazer a avaliação).

A agenda usa `Agendamento.modalidade` (substituiu o antigo `tipo`) para definir sala e capacidade.

- **Só Educação Física e Fisioterapia** têm sala/capacidade configurável. Model `Sala` = `nome` + `capacidadeEducacaoFisica` + `capacidadeFisioterapia` (toda sala já nasce com as duas). Editável na aba **Salas** de `/configuracoes`. **Avaliação e Terapia Manual continuam fixas** em `MODALIDADE_SALA_PADRAO` (`src/lib/salas.ts`): Sala 2 - Avaliação (1), Sala 3 - Terapias Manuais (2). Elas não usam o cadastro de sala por plano abaixo — não vêm de um `Plano`.
- Actions em `src/actions/salas.ts` (`listSalas`, `createSala`, `updateSala` = nome + as duas capacidades, `deleteSala` — recusa excluir sala referenciada por um `PlanoSala`). Validação em `src/lib/validations/sala.ts`. UI: `src/components/configuracoes/salas-config.tsx` — CRUD em diálogo (card read-only por sala + botões editar/excluir, botão "Nova sala" no topo), `SalaFormDialog` serve criação e edição; mantém sempre ≥ 1 sala (esconde excluir quando só há uma).
- Seed inicial (migration `20260908162333_salas_configuraveis` e `prisma/seed.ts`): **Sala 1 - Cinesioterapia**, EF 5 / Fisio 4.
- `getConfigSalas()` (`src/lib/salas-config.ts`, `cache()` do React) só é usada hoje por Avaliação/Terapia Manual e pela aba Horários de `/configuracoes` (info decorativa); Educação Física e Fisioterapia não usam mais a soma entre todas as salas — ver "Sala por plano" abaixo.

### Sala por plano (Fisioterapia / Educação Física)

Cada `Plano` cadastra em quais salas ele pode ser executado — model `PlanoSala` (`planoId` + `salaId` + `descricao` livre, ex. "Usa a Sala 2 para uso de equipamentos"). **Obrigatório**: `planoSchema` exige pelo menos 1 sala marcada; sem isso o form de Plano não salva. Um plano `ATIVO` sem `PlanoSala` (dado legado de antes desse recurso) **bloqueia agendamento** até alguém editar o plano e marcar a sala — nunca cria um `Agendamento` sem sala. Editável no form do Plano (`plano-form.tsx`, seção "Salas de atendimento": checkbox por sala + campo de descrição que aparece quando marcada, `salas={listSalas()}` vindo da page).

- **Múltiplas salas por plano**: o sistema tenta cada `PlanoSala` do plano, na ordem de `Sala.ordem`, e usa a **primeira com vaga** — lógica pura em `src/lib/sala-plano.ts` (`escolherSalaComVaga`, `vagasTotais`, testados em `sala-plano.test.ts`).
- **Resolução com I/O** em `src/lib/agendamento-checagens.ts`: `getSalasCandidatasPlano(planoAtribuicaoId, modalidade)` lê as `PlanoSala` do plano da atribuição; `resolverSalaPlano(...)` escolhe a sala (ou devolve erro — sem sala configurada, ou todas lotadas) e é chamada em `criarAgendamentoAssistido`, `remarcarAgendamento` (quando o agendamento tem `planoAtribuicaoId`) e `materializarGradeRecorrente`; `vagasDisponiveisPlano(...)` só soma vagas pra exibição (calendário/grade de horários), sem escolher sala. **A capacidade agora é checada por sala específica do plano, não mais somada entre todas as salas da modalidade** (`verificarCapacidade`/`getConfigSalas` continuam existindo só para Avaliação/Terapia Manual, que não passam por um plano).
- `Agendamento.salaId` grava a sala escolhida (nula para Avaliação/Terapia Manual e para agendamentos antigos anteriores a esse recurso). Exibida no diálogo de detalhes do `EventoChip` e na coluna/linha "Sala" de `agendamentos-table.tsx`.
- Toda função de disponibilidade que atende Fisioterapia/Educação Física (`getDisponibilidadeHorarios`, `calcularDiasDisponiveis`/`getDisponibilidadeMes`, `getDadosAgendamentoAssistido`) recebe `planoAtribuicaoId` pra escopar a capacidade às salas daquele plano — nunca usar a versão sem esse parâmetro pra essas duas modalidades.

Capacidade é contada **por paciente** (não por evento): a soma de pacientes de todos os agendamentos que se sobrepõem no tempo, na mesma sala e modalidade, não pode passar da capacidade daquela sala. Checado por `resolverSalaPlano`/`verificarCapacidade` (`src/lib/agendamento-checagens.ts`), junto com `buscarConflito` (conflito de profissional) — as duas convivem: uma impede o profissional de atender 2 salas ao mesmo tempo, a outra impede lotar a sala.

**Uma sala nunca atende Fisioterapia e Educação Física ao mesmo tempo**, mesmo tendo capacidade configurada pras duas: a partir do momento que a sala tem 1 agendamento de uma modalidade num horário, ela fica **exclusiva** daquela modalidade pra qualquer outro agendamento que se sobreponha, mesmo que ainda "coubesse" numericamente na capacidade da outra. `ocupacaoPorSala` (`src/lib/agendamento-checagens.ts`) devolve, além da ocupação por paciente, o conjunto de salas já em uso por outra modalidade nesse horário (`bloqueadas`); `escolherSalaComVaga`/`vagasTotais` (`src/lib/sala-plano.ts`, testados em `sala-plano.test.ts`) pulam essas salas ao escolher/contar vaga, tanto em `resolverSalaPlano` quanto em `vagasDisponiveisPlano`.

Educação Física e Fisioterapia têm grade fixa de horários, configurável na aba **Horários** de **Configurações** (`/configuracoes`, model `HorarioAtendimento`) — é lá que o usuário adiciona/remove/ativa horários pré-estabelecidos. Avaliação e Terapia Manual usam horário livre (só a capacidade da sala é aplicada, sem grade fixa). O wizard `AgendamentoAssistidoDialog` e o wizard de remarcação buscam vagas via `getDisponibilidadeHorarios` e desabilitam horários lotados quando a modalidade tem grade fixa.

## Dias de funcionamento e feriados

Aba **Funcionamento** de `/configuracoes` (`src/components/configuracoes/funcionamento-config.tsx`): quais dias da semana a clínica atende (7 checkboxes, model `DiaFuncionamento` — uma linha por `DiaSemana`, `aberto` bool) e um cadastro de **feriados** (model `Feriado` = `data @db.Date @unique` + `descricao`). Os dois **bloqueiam agendamento** naquele dia.

- Leitura: `getConfigFuncionamento()` (`src/lib/funcionamento-config.ts`), `cache()` do React, devolve `{ diasAbertos: Set<number> (0=domingo), feriados: Map<"YYYY-MM-DD", string> }`. Sem nenhuma linha `DiaFuncionamento` assume todos os dias abertos (agenda nunca trava sozinha). **Nunca importar em client component** (usa Prisma).
- Validação no server: `validarFuncionamento(dataInicio)` (mesmo arquivo) roda em `criarAgendamentoAssistido`, `remarcarAgendamento` e na materialização da grade (`materializarGradeRecorrente`). Feriado no dia de um `@db.Date` é comparado pelo ymd em UTC (`data.toISOString().slice(0,10)`); a data do agendamento vira ymd de Brasília via `toDateInputValue`.
- Disponibilidade: `calcularDiasDisponiveis` e `getDisponibilidadeHorarios` marcam dia fechado / feriado como `temHorarios: false, lotado: true` (aparece vermelho/indisponível nos wizards de agendamento e remarcação — vale também para Avaliação/Terapia Manual, que são horário livre).
- Helpers puros em `src/lib/funcionamento.ts` (`DIA_SEMANA_INFO`, `DIA_SEMANA_INDICE`, `diaSemanaDeYmd`). Actions em `src/actions/funcionamento.ts` (`listDiasFuncionamento`, `listFeriados`, `setDiaFuncionamento`, `createFeriado`, `deleteFeriado`). Validação em `src/lib/validations/funcionamento.ts`.
- Seed (migration `20260908230000_dias_funcionamento_feriados` + `prisma/seed.ts`): segunda a sábado aberto, domingo fechado.

## Ações rápidas de agendamento (calendário, lista, dashboard)

As modificações ficam em diálogo, **fora da agenda** (que é só leitura — ver diretriz acima):

- **Calendário** (`EventoChip`, visões mês/semana/dia): clicar no evento abre um diálogo **só de detalhes** (título, data/hora, status, modalidade, profissional, pacientes). Sem Editar/Remarcar/Excluir.
- **Aba "Agendamentos" do paciente** (`paciente-agendamentos-tab.tsx`): Compareceu / Faltou / Remarcar (`RemarcarDialog`) por slot `AGENDADO`.
- **Dashboard** (`agenda-resumo-card.tsx`): Compareceu / Faltou / Remarcar por item.
- **Remarcar é um wizard de 2 passos** (`RemarcarConteudo`, corpo sem Dialog): passo 1 = `CalendarioDisponibilidade` (calendário mensal com dias **azuis** = têm vaga, **X vermelho** = lotados), passo 2 = `GradeHorariosDisponiveis` (pílulas azul/vermelho com `vagas/capacidade`) da modalidade do evento. Para modalidade com grade fixa usa `getDisponibilidadeMes` + `getDisponibilidadeHorarios`; para horário livre (Avaliação / Terapia Manual) todo dia fica disponível e o passo 2 gera a grade de 30 min filtrada por conflito de profissional. `RemarcarAlvo` carrega `modalidade`. Embrulhado por `RemarcarDialog` (aba do paciente / dashboard).
- `CalendarioDisponibilidade` e `GradeHorariosDisponiveis` (`src/components/agendamentos/`) são compartilhados entre o wizard de remarcação e o `AgendamentoAssistidoDialog` (agendamento por plano) — mesma UX de disponibilidade nos dois. No calendário é **binário**: dia com vaga = **borda + fundo azul** (clicável); qualquer outro dia do mês (lotado, sem grade, passado, limite de plano atingido) = **borda + fundo vermelho com X** e desabilitado. Legenda "Disponível / Indisponível".
- Depois de uma ação no card do dashboard (`agenda-resumo-card.tsx`), a lista é re-sincronizada via `key` no componente (em `dashboard/page.tsx`, derivada de id+status+dataInicio de cada agendamento) — remonta com os dados frescos que o RSC revalidou, sem `useEffect` de derivação de estado.

**Gotcha de portal + evento React**: dialogs renderizados de dentro de um elemento com `onClick` propagam cliques pela árvore React mesmo estando em portal no DOM. Todo `DialogContent` dentro do calendário mantém `onClick`/`onPointerDown` com `e.stopPropagation()` por segurança, mesmo agora que as células do calendário não têm mais `onClick`.

## Agendamento assistido por plano (wizard na tela do paciente)

Botão **"Agendamentos"** no header do paciente (antes de "Histórico clínico") abre um wizard de 3 passos (`agendamento-assistido-dialog.tsx`): **1)** plano ativo + profissional, **2)** dia, **3)** horário.

- Só planos com atribuição `status: "ATIVO"`; uma opção por tipo do plano (`plano.tipos` → modalidade: `EDUCACAO_FISICA`/`FISIOTERAPIA`). A modalidade escolhida fixa sala e grade de horários.
- **Limite do plano tem DOIS tetos, os dois são obrigatórios (client + server):**
  - **Total do período** (teto duro): `atendimentos × meses` = `totalAtendimentosPlano` (`src/lib/plano-renovacao.ts`, reusa `MESES_COBERTURA_GRADE`/`orcamentoGrade`). MENSAL 4x = **4 no total**; TRIMESTRAL 4x = 12. Contado por `contarAgendamentosDaAtribuicao` (todos os não-cancelados da atribuição, sem filtro de mês). Nunca pode passar disso — foi um bug real: a grade materializou 3+1 (mês 1 sem horário) e o usuário conseguiu marcar um 4º no mês 1 pela aba porque só havia checagem mensal.
  - **Limite mensal** (o mês cheio transborda para os meses seguintes do plano): `atribuicao.atendimentos`, `contarAgendamentosNoMes`.
  - `criarAgendamentoAssistido` checa **total primeiro** (erro "todos já foram agendados"), depois mês ("agende em outro mês do período"). `getDisponibilidadeMesAssistido` devolve `limiteTotalAtingido` / `limiteMesAtingido` / `limiteAtingido` (= total ∨ mês, bloqueia a visão do mês no wizard). Helpers puros de UI em `src/lib/consumo-plano.ts` (`slotsVaziosNoMes`, `podeAgendarMais`, + `consumo-plano.test.ts`).
- Destaque de disponibilidade: **azul** = dia/horário com vaga, **vermelho** = lotado (ou limite mensal atingido). Dias sem grade de horários ou no passado ficam desabilitados.
- `criarAgendamentoAssistido` reusa `buscarConflito` + `verificarCapacidade`; cria com `titulo` = `"{Modalidade} — {Paciente}"`, `status: "AGENDADO"`.

### Aba "Agendamentos" do paciente

Aba entre "Planos" e "Financeiro" (`paciente-agendamentos-tab.tsx`, dados de `getConsumoPlanoPaciente(pacienteId, ano, mes)`): navegação por mês. Para cada atribuição ativa mostra "X de N atendimentos neste mês · **usadosTotal de total no plano**" + badge de disponíveis (o `disponiveisTotal`, que é o teto vinculante). A **lista numerada** de slots do mês tem `usados` preenchidos + **só** `slotsVaziosNoMes(...)` vazios — nunca mais slots "Disponível para agendar" do que o total do plano ainda permite (senão induziria a marcar além do teto). `getConsumoPlanoPaciente` devolve `total`, `usadosTotal`, `disponiveisTotal`, `periodicidade` além dos campos mensais. Botão de ação = `AgendamentoAssistidoDialog`.

Ações por slot (lado clínica, `!somenteLeitura`): slot preenchido `AGENDADO` tem **Compareceu / Faltou** (chama `atualizarStatusAgendamento`, atualização otimista via `statusOverride`) **+ Remarcar** (`RemarcarDialog`, mesmo wizard da agenda — consome crédito de remarcação); já marcado mostra o badge de status + botão ↺ pra reverter pra `AGENDADO`. Slot vazio tem botão **Agendar** que abre o `AgendamentoAssistidoDialog` (aceita props `label`/`size` pro trigger).

## Grade de atendimento recorrente por plano

Model `GradeRecorrenteAtendimento` (`planoAtribuicaoId`, `modalidade`, `diaSemana`, `horario`, `profissionalId?`, `ativo`): um **modelo semanal** de atendimento de um plano atribuído. Cada linha = 1 (dia da semana + horário + profissional) que se repete toda semana enquanto a atribuição está `ATIVO`, para o paciente não ter que reagendar tudo mês a mês.

- **Geração é preguiçosa e por orçamento total do plano** — nunca há cron. `materializarGradeRecorrente(atribuicaoId)` (`src/actions/grade-recorrente.ts`):
  - `MESES_COBERTURA_GRADE` = **1 mês para MENSAL, 3 para TRIMESTRAL**. **Total de atendimentos = `orcamentoGrade(atendimentos, meses)` = `atendimentos × meses`** (`src/lib/grade-recorrente.ts`).
  - Materializa as ocorrências da grade **em ordem de data**, respeitando o **limite mensal** (`atendimentos`/mês). O que não coube num mês (ex. plano começou dia 09 e só sobraram 3 segundas) **transborda para os meses seguintes** até esgotar o total — `usadosTotal >= orcamentoTotal` → `break`.
  - O intervalo de datas usa `janelaCoberturaGrade(dataInicioYmd, meses + bufferMesesGrade(orcamentoTotal))`; o corte real é sempre o orçamento total, nunca a data. **Bug real corrigido**: com um buffer fixo curto, uma grade "rala" (poucos dias/semana) num plano com muitos atendimentos/mês podia nunca atingir o total contratado — a janela acabava primeiro e o restante do orçamento era perdido silenciosamente, sem avisar ninguém. `bufferMesesGrade` (`src/lib/grade-recorrente.ts`) usa um buffer bem maior (`BUFFER_MAXIMO_MESES = 24`) sempre que o plano tem teto total, só caindo no buffer padrão (`BUFFER_PADRAO_MESES = 2`) quando o plano não tem limite mensal (sem "total" a perseguir). Testado em `grade-recorrente.test.ts`.
  - **Prévia ao vivo no editor da grade**: `previewGradeRecorrente(atribuicaoId, linhas)` (`src/actions/grade-recorrente.ts`) + a lógica pura `preverGrade` (`src/lib/grade-recorrente.ts`, testada) calculam, sem gravar nada, quantos atendimentos a grade em edição geraria e se fecha o total do plano (dia da semana × limite mensal × total — não checa conflito de sala/profissional, isso só é conferido de fato ao salvar). `GradeRecorrenteDialog` chama isso com debounce a cada mudança nas linhas e mostra um banner verde ("preenche os N atendimentos do plano inteiro") ou âmbar ("só preenche N de TOTAL — adicione mais dias") antes do usuário salvar.
  - Passado tudo isso, a grade **para** até o plano ser renovado (editar a atribuição move `dataInicio` → nova janela/orçamento).
  - É **idempotente** (chave `gradeRecorrenteId` + `Agendamento.slotData @db.Date`). Disparos: `aplicarGradeRecorrente` ao salvar a atribuição (imediato); `materializarGradesPaciente(pacienteId)` no loader da aba Agendamentos (app **e** portal compartilhado); `materializarTodasGrades()` no topo de `agenda/page.tsx`.
- **`materializarGradeRecorrente` NÃO chama `revalidatePath`** (roda em render de RSC). Só as server actions revalidam.
- **Ordem de geração**: os slots (data × linha) são expandidos e ordenados por **data-calendário**, não linha por linha — assim o transbordo e o corte mensal seguem a ordem do calendário (ex. grade [Seg,Qua,Qui,Sex] + plano 4x → Seg/Qua/Qui/Sex da 1ª semana), não "4 quartas".
- Cada slot passa por: `validarFuncionamento` (dia fechado/feriado → pula), limite mensal (mês cheio → o atendimento vai pro mês seguinte, não é "pulado"), `buscarConflito` (profissional) e `verificarCapacidade` (sala) — reusa `src/lib/agendamento-checagens.ts` (extraído de `agendamentos.ts`: `buscarConflito`, `verificarCapacidade`, `validarProfissionalModalidade`, `mensagemConflito`).
- Agendamento gerado tem `titulo = "{Modalidade} — {Paciente}"`, `status: AGENDADO`, `planoAtribuicaoId` + `gradeRecorrenteId` + `slotData`.
- **Remarcar/desmarcar não muda**: `slotData` fica no dia original, então o gerador não recria o slot; o agendamento remarcado continua contando no limite mensal por `planoAtribuicaoId`.
- **Editor da grade** = `GradeSection` (`src/components/plano-atribuicoes/grade-section.tsx`, prop `bare` p/ uso dentro de diálogo). Aparece em dois lugares:
  - **Formulário de atribuição do plano** (`plano-atribuicao-form.tsx`, seção "Grade de atendimento recorrente"): linhas num hidden input JSON (`gradeLinhas`); `createPlanoAtribuicao`/`updatePlanoAtribuicao` validam com `validarLinhasGrade` (antes de gravar) e aplicam com `aplicarGradeRecorrente` (depois da transação). Trocar de plano ignora (no submit) linhas fora das novas `Plano.tipos`.
  - **Aba "Agendamentos" do paciente** (lado clínica): ícone `CalendarCog` no header de cada card de plano → `GradeRecorrenteDialog` (`src/components/pacientes/grade-recorrente-dialog.tsx`) → `salvarGradeRecorrente(atribuicaoId, linhas)` (valida + `aplicarGradeRecorrente` + revalida). Contexto (`getGradeRecorrenteContexto(pacienteId)` = opções + linhas por atribuição) vem por prop do loader; ausente no portal público.
  - Opções do editor: `getGradeRecorrenteOpcoes()` (horários por modalidade + profissionais). Modalidades vêm de `Plano.tipos`.
  - **A grade tem no máximo `atribuicao.atendimentos` linhas** (a quantidade de atendimentos do plano no mês); cada linha é rotulada "Nº atendimento". O botão "Adicionar dia" desabilita no limite; `validarLinhasGrade(linhas, tipos, maxAtendimentos)` reforça no server.
- **Aplicar a grade** (`aplicarGradeRecorrente`): **reconciliação total** — toda alteração da grade apaga TODOS os agendamentos ligados à grade da atribuição que ainda não aconteceram (`dataInicio > agora`, `status: AGENDADO`), inclusive os já remarcados, e recria a partir da grade nova (`materializarGradeRecorrente`, respeitando limite mensal / capacidade / conflito). COMPARECEU/FALTOU/CANCELADO nunca são tocados. As linhas da grade são diffadas por `modalidade|diaSemana|horario|profissionalId`. Os top-ups preguiçosos (`materializarGradesPaciente`/`materializarTodasGrades`) **não** apagam nada — só preenchem lacunas (idempotência por `gradeRecorrenteId` + `slotData`).
- `cancelarPlanoAtribuicao` desativa as linhas (`ativo: false`) e apaga agendamentos futuros `gradeRecorrenteId != null, status: AGENDADO`.
- Validação: `src/lib/validations/grade-recorrente.ts`. Auditoria: `GradeRecorrenteAtendimento` em `MODULO_LABEL`.

### Bug real corrigido — mês "preso" no cache do cliente após salvar

`PacienteAgendamentosTab` (`paciente-agendamentos-tab.tsx`) mostra o mês inicial (`anoInicial`/`mesInicial`, vindo por prop do server) e guarda qualquer outro mês navegado num cache local (`outroMes`), pra não refazer o fetch toda hora. Bug: salvar a grade / remarcar / desmarcar disparam `router.refresh()`/`revalidatePath`, que só chegam fresquinhos pro **mês inicial** (nova prop `resumoInicial`) — o `outroMes` (se o usuário estava navegando por outro mês) ficava com o dado antigo até um F5. Corrigido com um `useEffect` que zera `outroMes` toda vez que a referência de `resumoInicial` muda (sinal de que o servidor revalidou algo) — força o mês exibido a ser buscado de novo, seja ele qual for. **Padrão a repetir**: qualquer componente client que cacheia localmente "outra página/mês/aba" de dado que pode mudar por uma mutação em outro lugar da árvore precisa desse tipo de invalidação — não basta confiar em `router.refresh()`/`revalidatePath` sozinhos, eles só atualizam props vindas do server, não estado local já guardado no client.

## Dashboard — resumo de compromissos

Aba "Agenda" do dashboard tem **só** o card **"Meus compromissos"** (`agenda-resumo-card.tsx`) — sem KPIs (os cards de contagem "Pacientes/Avaliações/Evoluções" foram removidos dessa aba; `KpiGrid` segue só na aba Financeiro). O card tem 3 chips de contagem (Hoje / Semana / Mês, via `getContagensAgenda`) que também trocam o período da lista; a lista (`getProximosAgendamentos`, do início do dia até o fim do período, exclui só `CANCELADO`) vem em ordem cronológica, agrupada por dia (cabeçalho de dia aparece em Semana/Mês), cada item com pílula de horário (início/fim), nome do paciente, badge de modalidade colorida (`MODALIDADE_COR`: Educação Física = âmbar, Fisioterapia = azul/primary, Avaliação = violeta, Terapia Manual = teal) e profissional. Ações Compareceu/Faltou/Remarcar só em itens `AGENDADO`.

## Dashboard — aba Financeiro (análise financeira)

Aba "Financeiro" do dashboard = `AnaliseFinanceira` (`src/components/dashboard/analise-financeira.tsx`, client, usa **recharts** + o wrapper `src/components/ui/chart.tsx` do shadcn). Dados de `getAnaliseFinanceira()` (`src/actions/dashboard.ts`): uma única query de `Cobranca` (PAGO dos últimos 12 meses ∪ todas PENDENTE) com `planoAtribuicao.plano.tipos`, mapeada para `CobrancaLinha[]` e agregada por `analisarFinanceiro` (puro, testado).

- **Toda a lógica de agregação fica em `src/lib/financeiro.ts`** (puro, sem Prisma) + `financeiro.test.ts`. Bucketing por mês é sempre no fuso de Brasília via `Intl` (`mesReferencia` → "YYYY-MM", `rotuloMes` → "jan/25", `sequenciaMeses`) — nunca `getMonth()`. Ver seção de fuso horário.
- **Categorias de receita** (`CategoriaReceita`, `categoriaReceita(tipos)`): classifica cada cobrança pelos `Plano.tipos` da atribuição — `null`/`[]` (cobrança avulsa, sem plano) → **AVULSO**; 1 tipo → `FISIOTERAPIA`/`EDUCACAO_FISICA`; **≥ 2 tipos → COMBINADO** (não se tenta ratear plano que atende as duas modalidades). Labels/cores em `LABEL_CATEGORIA_RECEITA`/`COR_CATEGORIA_RECEITA` (Fisio = `--chart-1` azul, EF = `--chart-2` âmbar, Combinado = violet, Avulso = muted).
- Seções: KPIs (recebido no mês, a receber no mês, em atraso, ticket médio 12m, recebido 12m) · área "Receita por mês" (12m) · donut "De onde vem o dinheiro" (split do mês) · barra empilhada "Evolução por modalidade" (6m) · "A receber nos próximos meses" (6m, **só cobranças PENDENTE já lançadas e ainda não vencidas**, agrupadas por mês do vencimento — sem projeção de renovação) · rankings "Planos/Pacientes que mais faturam" (recebido 12m) · "Cobranças em atraso".
- `getResumoFinanceiro` foi **substituído** por `getAnaliseFinanceira`. `KpiGrid` foi extraído para `src/components/dashboard/kpi-grid.tsx` (aceita `hint` e `tone: "danger"`).

## Observabilidade — trilha de auditoria (tela /logs)

Toda operação de **escrita** (create/update/upsert/delete e variantes `*Many`) em qualquer model é registrada automaticamente na tabela `AuditLog` — **não há chamada manual em server action**. A captura é uma extensão do Prisma Client (`base.$extends({ query: { $allModels: { $allOperations } } })` em `src/lib/prisma.ts`):

- Grava `modulo` (nome do model), `acao` (operação), `registroId`, `resumo` (rótulo pt-BR + nome/título do registro quando dá pra inferir), `dados` (JSON com `data`/`where`/`create`/`update` sanitizados — `password` vira `[oculto]`, strings e arrays truncados, `Decimal`→número, `Date`→ISO) e `usuarioId`/`usuarioNome`.
- **Usuário**: `usuarioAtual` faz `import("@/lib/auth")` dinâmico (evita ciclo, já que `auth.ts` importa `prisma.ts`) embrulhado em `cache()` do React (dedupe por request, não decodifica o JWT a cada query). Fora de request (seed/script) cai em `null` = "Sistema".
- Em `delete` de registro único, busca o estado anterior (`findUnique`) antes de apagar, pra guardar em `dados.registro`.
- O log **nunca quebra a operação real** (`void registrar(...).catch(() => {})`); e `model === "AuditLog"` é ignorado (sem recursão — além disso a escrita do log usa o client base, sem extensão).
- Rótulos pt-BR de model/ação em `src/lib/audit.ts` (`MODULO_LABEL`, `ACAO_LABEL`). Model novo → adicionar em `MODULO_LABEL` (senão aparece com o nome cru).
- Desligar em ambiente específico: `AUDIT_LOG=off`.
- Tela `/logs` (última no menu): filtros por texto / módulo / ação / intervalo de datas (padrão de filtros da URL), paginação, e "Detalhes" abre o JSON de `dados`.

## Compartilhar acesso — portal público do paciente

Botão **"Compartilhar acesso"** no header do paciente (`compartilhar-acesso-dialog.tsx`) gera um link **sem login** onde o paciente vê avaliações, evoluções, treinos, planos e financeiro e agenda pelos planos ativos.

- Model `AcessoCompartilhadoPaciente` (`token @unique`, `ativo`, `expiraEm?`) — link **revogável**. Actions em `src/actions/acessos-compartilhados.ts` (exigem sessão). `resolverPacientePorToken` (`src/lib/acesso-compartilhado.ts`) valida token/ativo/expiração e faz `notFound()`.
- Rota `src/app/compartilhado/paciente/[token]/` (já liberada no `proxy.ts` por `/compartilhado`). `layout.tsx` é o shell público (logo + gradiente de marca). A `page.tsx` reusa `PacienteTabs` (sem `action`) + as actions de leitura já existentes (`getAvaliacoesByPaciente`, `getEvolucoesByPaciente`, `listPlanoAtribuicoesByPaciente`, `getCobrancasByPaciente`, `getConsumoPlanoPaciente`) e a query de treinos ativos.
- Componentes read-only: `src/components/compartilhado/{avaliacoes-publicas,evolucoes-publicas}.tsx`; `PlanoAtribuicoesList` aceita `showActions={false}`; `PacienteCobrancasList` aceita `somenteLeitura` (esconde `CobrancaRowActions`, sem QR PIX); `PacienteAgendamentosTab` aceita `somenteLeitura` (esconde Compareceu/Faltou, mantém o `AgendamentoAssistidoDialog` de auto-agendamento). Treinos reusam `TreinoCompartilhadoView`.
- O auto-agendamento usa o mesmo `AgendamentoAssistidoDialog` + actions (`criarAgendamentoAssistido` etc.) — não leem `auth()`; a escrita é auditada como "Sistema".

### Desmarcar pelo portal (regra das 2h — só o paciente)

Pelo portal, cada slot preenchido `AGENDADO` tem botão **"Desmarcar"** (`DesmarcarSlotButton` em `paciente-agendamentos-tab.tsx`, só quando `somenteLeitura`). Regra em `src/lib/agendamento-cancelamento.ts` (`pacientePodeDesmarcar`, `HORAS_ANTECEDENCIA_CANCELAMENTO = 2`):

- Só é possível desmarcar **até 2h antes** do início. Fora do prazo o diálogo explica a regra e **não** oferece ação — o agendamento fica `AGENDADO` e a falta é registrada pela clínica no fluxo normal (o "crédito" fica consumido).
- Desmarcar a tempo = `desmarcarAgendamentoPeloPaciente(agendamentoId, pacienteId, justificativa)` seta `status: "CANCELADO"` (+ nota em `observacao`). A vaga do plano no mês reabre sozinha porque `contarAgendamentosNoMes` / `getConsumoPlanoPaciente` ignoram `CANCELADO`, e a janela mês-calendário faz a vaga não usada expirar na virada do mês. O paciente reagenda pelo botão "Agendar" que já existe.
- **Justificativa é obrigatória** (`>= 3` chars) tanto para o paciente desmarcar quanto para a clínica remarcar (ver créditos abaixo).
- O lado da clínica **não** passa pela regra das 2h — cancela/exclui livremente. Mas o wizard **Remarcar** consome crédito (abaixo).

### Créditos de remarcação por plano

`Plano.creditosRemarcacao` (`Int`, campo no cadastro do Plano; **sem** override por atribuição — mas é copiado como snapshot para `PlanoAtribuicao.creditosRemarcacao` no create/update da atribuição, para resiliência). É o **máximo de remarcações por mês-calendário** de um atendimento ligado àquele plano. Contador **separado** do limite mensal de atendimentos (`atribuicao.atendimentos`).

- **Trilha de consumo**: model `CreditoRemarcacao` (`planoAtribuicaoId`, `agendamentoId?`, `origem` = `PACIENTE`|`CLINICA`, `justificativa`, `createdAt`). **1 linha = 1 crédito consumido**. Não há contador mutável nem cron: `contarCreditosRemarcacaoNoMes(atribuicaoId, ref)` (`src/actions/agendamentos.ts`) conta linhas por `createdAt` na janela mês-calendário de Brasília (`inicioDoMes`/`fimDoMes` de `datas-brasilia.ts`). Reset mensal é automático (nova contagem). Helpers puros em `src/lib/remarcacao-creditos.ts` (`creditosDisponiveis`, `semCreditos`).
- **O que debita 1 crédito** (só para agendamento com `planoAtribuicaoId`):
  - paciente desmarca pelo portal (dentro do prazo de 2h) — `origem: PACIENTE`. O ato de desmarcar já debita; reagendar depois **não** debita de novo.
  - clínica remarca pelo wizard **"Remarcar"** (`remarcarAgendamento`, calendário/lista/dashboard) — `origem: CLINICA`.
  - **Não** debitam: cancelar a atribuição do plano (`cancelarPlanoAtribuicao`), reconciliar a grade (`aplicarGradeRecorrente`), agendamento sem plano.
- **Sem saldo**:
  - paciente (dentro do prazo) → **bloqueado** com mensagem genérica ("Não é possível desmarcar por aqui neste momento. Entre em contato com a clínica."), **sem** revelar números; agendamento fica `AGENDADO`.
  - clínica → `remarcarAgendamento` retorna `{ requiresConfirmacao: true }`; o wizard (`RemarcarConteudo`) mostra confirmação inline e reenvia com `forcar: true`, remarcando mesmo assim (o mês fica no vermelho).
- **O paciente NUNCA vê o saldo** (nem na UI nem no payload RSC — a page do portal zera `creditos` antes de passar ao client). O saldo só aparece do lado da clínica: aba "Agendamentos" do paciente (`paciente-agendamentos-tab.tsx`, ramo `!somenteLeitura`) mostra "Remarcações: X de N neste mês" por plano; `getConsumoPlanoPaciente` devolve `creditos: { max, usados, disponiveis }` por atribuição.
- `RemarcarAlvo` (wizard) carrega `planoAtribuicaoId`; `EventoCalendario` também. Auditoria: `CreditoRemarcacao` em `MODULO_LABEL` (`src/lib/audit.ts`).

## Fuso horário — tudo em horário de Brasília (LEIA ANTES DE MEXER EM QUALQUER DATA)

A clínica opera em `America/Sao_Paulo` (UTC-3 fixo, sem horário de verão desde 2019). **Não confie no fuso do processo** — a Vercel roda as server functions em UTC e o `next.config.ts` seta `process.env.TZ` mas isso não é 100% garantido em todo runtime. O navegador de um usuário pode estar em qualquer fuso. **Toda lógica de data tem que ser explícita sobre o fuso**, no servidor e no cliente.

### Bug recorrente

Todo problema de "evento com hora errada / evento sumindo do calendário / contador da semana zerado" teve a mesma raiz: algum código montou uma data ou uma borda de intervalo usando o fuso do processo/navegador em vez de Brasília, e servidor e cliente discordaram por 3h.

### PROIBIDO (essas APIs usam o fuso do processo/navegador)

- `new Date("2026-09-03T13:10:00")` sem offset → use `combinarDataHora(data, hora)` (anexa `-03:00`)
- `date.getHours()` / `getDate()` / `getDay()` / `getMonth()` / `setHours(...)` para lógica → use os helpers de `src/lib/format.ts` / `src/lib/datas-brasilia.ts`
- `date-fns` `startOfDay` / `endOfDay` / `startOfWeek` / `endOfWeek` / `startOfMonth` / `endOfMonth` com `new Date()` → use `src/lib/datas-brasilia.ts`
- `date.toLocaleString/toLocaleDateString/toLocaleTimeString(...)` **sem** `timeZone: "America/Sao_Paulo"`
- `date-fns` `format(...)` para hora do dia (não aceita timeZone) → use `toTimeInputValue` / `formatarDataHora`
- comparar dois `Date` "do mesmo dia" via `d.getFullYear()===... && getMonth()===...` → compare `toDateInputValue(a) === toDateInputValue(b)`

### OBRIGATÓRIO

- **Entrada (form → banco)**: `combinarDataHora(data, hora)` (`src/lib/validations/agendamento.ts`) — interpreta como Brasília, resultado independe do fuso do processo.
- **Colunas com hora relevante**: `@db.Timestamptz(3)` (ex. `Agendamento.dataInicio/dataFim`) — instante real, não timestamp naïve.
- **Exibição**: helpers de `src/lib/format.ts`, todos ancorados em `America/Sao_Paulo`: `formatarData`, `formatarDataHora`, `toDateInputValue` (YYYY-MM-DD), `toTimeInputValue` (HH:mm), `horaDoDia` (0-23, para agrupar por faixa horária). Componente client que precisa de `toLocale*` passa `timeZone: "America/Sao_Paulo"` explícito.
- **Bordas de intervalo (dia/semana/mês) em server action / query**: `src/lib/datas-brasilia.ts` — `inicioDoDia`, `fimDoDia`, `fimDaSemana` (semana começa domingo), `fimDoMes`. Calculam a borda no dia-calendário de Brasília sem depender do `TZ` do processo. É o que `getContagensAgenda` / `getProximosAgendamentos` (`src/actions/dashboard.ts`) usam.
- **Casar evento com célula de calendário** (`calendario-mes.tsx`, `grade-horaria.tsx`): comparar `toDateInputValue(dia) === toDateInputValue(evento.dataInicio)`, nunca comparar instantes ou usar `getDate()`.
- **Runtime (defesa extra, não fonte da verdade)**: `next.config.ts` faz `process.env.TZ = process.env.APP_TIMEZONE ?? "America/Sao_Paulo"`. `TZ` é nome reservado na Vercel; para trocar o fuso use a env var `APP_TIMEZONE`.

### Testes de regressão

`src/lib/datas-brasilia.test.ts` e `src/lib/validations/agendamento.test.ts` cobrem os limites e o `combinarDataHora` — rodam com `TZ` qualquer (o CI/local pode estar em Brasília, então os testes forçam cenários de virada de dia). Rodar `npm test` ao mexer em data.

## Planos e financeiro — parcelamento e nota fiscal

- **Nota fiscal é sempre inclusa.** Não existe mais forma de pagamento "+ NF": o enum `FormaPagamentoPlano` é só `A_VISTA` e `ATE_3X_CARTAO`, e todo valor cadastrado no `Plano` já contempla a NF (não se aplica a taxa `TAXA_NOTA_FISCAL` sobre cobranças geradas de plano). Cobranças avulsas (`cobranca-form.tsx`) mantêm o toggle manual de NF com a taxa de 7%.
- **Plano mensal nunca é parcelado** (parcela única) e **trimestral parcela em até 3x** (só na forma `ATE_3X_CARTAO`; trimestral à vista = 1 parcela). Regra central em `maxParcelasPlano(periodicidade, formaPagamento)` e `formaEfetiva(periodicidade, formaPagamento)` (`src/lib/planos.ts`) — mensal força `A_VISTA`. O `planoAtribuicaoSchema` valida o teto de parcelas por essa função; a server action normaliza a forma com `formaEfetiva` antes de gravar.
- **`Plano` tem 3 preços**: `valorAVistaMensal`, `valorAVistaTrimestral`, `valorAte3xTrimestral` (todos com NF embutida). `valorPlano(plano, forma, periodicidade)` resolve qual usar.
- No `plano-atribuicao-form.tsx` a seção "Forma de pagamento" só aparece quando a periodicidade é `TRIMESTRAL`; em mensal mostra só o aviso de parcela única.
- Testes: `src/lib/planos.test.ts`, `src/lib/validations/plano.test.ts`, `src/lib/validations/plano-atribuicao.test.ts`.
- **Um paciente pode ter mais de um plano `ATIVO` ao mesmo tempo** (ex. um de Fisioterapia + um de Educação Física) — o wizard de agendamento assistido já lista uma opção por atribuição ativa. `PlanoAtribuicoesList` (`src/components/plano-atribuicoes/plano-atribuicoes-list.tsx`, aba Planos do paciente / portal) renderiza **todas** as atribuições `ATIVO`, e joga só as `CANCELADO`/`CONCLUIDO` no "Histórico de planos".

### Renovação de planos atribuídos

Aba **Renovações** de `/planos` (`?tab=renovacoes`, `PlanosTabs` + `RenovacoesList`) — só um **lembrete** para a clínica renovar quem já cumpriu todo o período.

- **Renovável** (`planoRenovavel` em `src/lib/plano-renovacao.ts`, puro + `plano-renovacao.test.ts`): atribuição `ATIVO` + ≥ 1 cobrança e **todas `PAGO`** + **nenhum agendamento `AGENDADO`** + agendamentos `COMPARECEU`/`FALTOU` ≥ `totalAtendimentosPlano` (= `atendimentos × meses`, reusa `orcamentoGrade`/`MESES_COBERTURA_GRADE`).
- `listPlanosRenovaveis()` / `renovarPlanoAtribuicao(atribuicaoId, primeiraData, numeroParcelas)` em `src/actions/plano-atribuicoes.ts`. Renovar: atribuição antiga → `status: CONCLUIDO` (fica no histórico do paciente, nada é apagado) + grade dela desativada; cria **nova** atribuição `ATIVO` + novas cobranças. Copia `periodicidade`/`formaPagamento`/`desconto` da antiga e **recalcula o valor** pelos preços atuais do `Plano`. **A grade recorrente NÃO é copiada** (a nova nasce sem grade). Diálogo `RenovarPlanoDialog` pede data da 1ª parcela (default = `inicioDoProximoMes()`) + nº de parcelas (`gerarDatasVencimento`).
- O status `CONCLUIDO` de `StatusPlanoAtribuicao` só é usado aqui.

## Seed

`npm run db:seed` (idempotente, via `upsert`) cria: usuário admin padrão (`admin@admin.com` / `admin`), a Sala 1 - Cinesioterapia, dias de funcionamento (segunda a sábado), e uma **grade padrão de horários fixos** (07:00–16:00, de hora em hora com intervalo de almoço) pra Educação Física e Fisioterapia — sem isso um banco novo não materializa nenhum agendamento de plano (grade recorrente e wizard de agendamento exigem ≥1 horário ativo por modalidade). Reusado tal qual pela suíte E2E (`e2e/scripts/reset-test-db.ts`) pra montar o banco de teste do zero a cada rodada.
