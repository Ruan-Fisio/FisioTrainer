# FisioTrainer

Aplicação fullstack para um fisioterapeuta gerenciar sua clínica (usuários, biblioteca de exercícios, e módulos futuros: pacientes, consultas, agenda).

## Instruções para o Claude

Sempre que o usuário passar uma diretriz importante durante uma conversa (uma regra de negócio, um padrão de UI/UX, uma convenção de código que deve valer daqui pra frente), registrar essa diretriz neste arquivo na seção mais relevante, não só aplicar na tarefa da vez.

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

## Agenda — salas e modalidades

A agenda usa `Agendamento.modalidade` (substituiu o antigo `tipo`) para definir sala e capacidade. Regra de negócio fixa (não vem do banco), em `src/lib/salas.ts` (`MODALIDADE_SALA`):

- **Sala 1 - Cinesioterapia**: Educação Física até 5 pessoas, Fisioterapia até 4 pessoas — mesma sala, mas cada modalidade tem sua própria capacidade (não competem pela mesma vaga).
- **Sala 2 - Avaliação**: Avaliação, até 1 pessoa.
- **Sala 3 - Terapias Manuais**: Terapia Manual, até 2 pessoas.

Capacidade é contada **por paciente** (não por evento): a soma de pacientes de todos os agendamentos que se sobrepõem no tempo, para a mesma modalidade, não pode passar da capacidade da sala. Isso é checado em `verificarCapacidade` (`src/actions/agendamentos.ts`), chamada em toda criação/edição/remarcação, além da checagem de conflito por profissional já existente (as duas convivem: uma impede o profissional de atender 2 salas ao mesmo tempo, a outra impede lotar a sala).

Educação Física e Fisioterapia têm grade fixa de horários, configurável em **Configurações** (`/configuracoes`, model `HorarioAtendimento`) — é lá que o usuário adiciona/remove/ativa horários pré-estabelecidos. Avaliação e Terapia Manual usam horário livre (só a capacidade da sala é aplicada, sem grade fixa). O formulário de agendamento (`agendamento-form.tsx`) busca vagas disponíveis via `getDisponibilidadeHorarios` e filtra/desabilita horários lotados quando a modalidade tem grade fixa.

## Ações rápidas de agendamento (calendário, lista, dashboard)

Em nenhum desses lugares o usuário abre a "tela cheia" do evento — as ações Remarcar/Excluir ficam em diálogo:

- **Calendário** (`EventoChip`, visões mês/semana/dia): clicar no evento abre um diálogo de detalhes (título, data/hora, status, modalidade, profissional, pacientes) com **Excluir** (esquerda), **Remarcar** e **Editar** (direita). Excluir e Remarcar trocam o corpo do próprio diálogo (state machine `visao: "detalhes" | "remarcar" | "excluir"`, sem diálogo aninhado). Excluir em série recorrente mostra o radio de escopo (esta / seguintes / todas) → `deleteAgendamento(id, escopo)`.
- **Lista** (`agendamento-row-actions.tsx`): botão Remarcar + ícones editar/excluir. A `agendamentos-table.tsx` passa `remarcar={{ titulo, profissionalId, dataInicio, dataFim }}`.
- **Dashboard** (`agenda-resumo-card.tsx`): Compareceu / Faltou / Remarcar por item.
- **Remarcar é um wizard de 2 passos** (`RemarcarConteudo`, corpo sem Dialog): passo 1 = `CalendarioDisponibilidade` (calendário mensal com dias **azuis** = têm vaga, **X vermelho** = lotados), passo 2 = `GradeHorariosDisponiveis` (pílulas azul/vermelho com `vagas/capacidade`) da modalidade do evento. Para modalidade com grade fixa usa `getDisponibilidadeMes` + `getDisponibilidadeHorarios`; para horário livre (Avaliação / Terapia Manual) todo dia fica disponível e o passo 2 gera a grade de 30 min filtrada por conflito de profissional. `RemarcarAlvo` carrega `modalidade`. Embrulhado por `RemarcarDialog` (lista `sm:max-w-lg` / dashboard) ou inline no `EventoChip`.
- `CalendarioDisponibilidade` e `GradeHorariosDisponiveis` (`src/components/agendamentos/`) são compartilhados entre o wizard de remarcação e o `AgendamentoAssistidoDialog` (agendamento por plano) — mesma UX de disponibilidade nos dois. No calendário é **binário**: dia com vaga = **borda + fundo azul** (clicável); qualquer outro dia do mês (lotado, sem grade, passado, limite de plano atingido) = **borda + fundo vermelho com X** e desabilitado. Legenda "Disponível / Indisponível".
- Depois de uma ação no card do dashboard (`agenda-resumo-card.tsx`), a lista é re-sincronizada via `key` no componente (em `dashboard/page.tsx`, derivada de id+status+dataInicio de cada agendamento) — remonta com os dados frescos que o RSC revalidou, sem `useEffect` de derivação de estado.

**Gotcha de portal + evento React**: dialogs renderizados de dentro de um elemento com `onClick` (ex. a célula de dia do calendário que navega pra `/agenda/novo`) propagam cliques pela árvore React mesmo estando em portal no DOM. Todo `DialogContent` dentro do calendário precisa de `onClick`/`onPointerDown` com `e.stopPropagation()` (senão clicar "Excluir" dispara o `onClick` da célula e navega).

## Agendamento assistido por plano (wizard na tela do paciente)

Botão **"Agendamentos"** no header do paciente (antes de "Histórico clínico") abre um wizard de 3 passos (`agendamento-assistido-dialog.tsx`): **1)** plano ativo + profissional, **2)** dia, **3)** horário.

- Só planos com atribuição `status: "ATIVO"`; uma opção por tipo do plano (`plano.tipos` → modalidade: `EDUCACAO_FISICA`/`FISIOTERAPIA`). A modalidade escolhida fixa sala e grade de horários.
- **Limite do plano é por mês-calendário**: um plano de "5x" = no máximo 5 agendamentos daquela atribuição por mês. `Agendamento.planoAtribuicaoId` liga o agendamento à atribuição; `getDisponibilidadeMesAssistido` conta os do mês e `criarAgendamentoAssistido` bloqueia ao atingir `atribuicao.atendimentos`.
- Destaque de disponibilidade: **azul** = dia/horário com vaga, **vermelho** = lotado (ou limite mensal atingido). Dias sem grade de horários ou no passado ficam desabilitados.
- `criarAgendamentoAssistido` reusa `buscarConflito` + `verificarCapacidade`; cria com `titulo` = `"{Modalidade} — {Paciente}"`, `status: "AGENDADO"`.

### Aba "Agendamentos" do paciente

Aba entre "Planos" e "Financeiro" (`paciente-agendamentos-tab.tsx`, dados de `getConsumoPlanoPaciente(pacienteId, ano, mes)`): navegação por mês, e para cada atribuição de plano ativa mostra "X de N atendimentos usados neste mês" + badge de disponíveis, e uma **lista numerada** de N slots — os `usados` primeiros preenchidos com o agendamento (círculo azul cheio, "1º atendimento", data/hora, modalidade, profissional), o resto como slot tracejado "Disponível para agendar". O botão de ação da aba é o próprio `AgendamentoAssistidoDialog`.

Ações por slot: slot preenchido `AGENDADO` tem **Compareceu / Faltou** (chama `atualizarStatusAgendamento`, atualização otimista via `statusOverride`); já marcado mostra o badge de status + botão ↺ pra reverter pra `AGENDADO`. Slot vazio tem botão **Agendar** que abre o `AgendamentoAssistidoDialog` (aceita props `label`/`size` pro trigger).

## Dashboard — resumo de compromissos

Aba "Agenda" do dashboard tem **só** o card **"Meus compromissos"** (`agenda-resumo-card.tsx`) — sem KPIs (os cards de contagem "Pacientes/Avaliações/Evoluções" foram removidos dessa aba; `KpiGrid` segue só na aba Financeiro). O card tem 3 chips de contagem (Hoje / Semana / Mês, via `getContagensAgenda`) que também trocam o período da lista; a lista (`getProximosAgendamentos`, do início do dia até o fim do período, exclui só `CANCELADO`) vem em ordem cronológica, agrupada por dia (cabeçalho de dia aparece em Semana/Mês), cada item com pílula de horário (início/fim), nome do paciente, badge de modalidade colorida (`MODALIDADE_COR`: Educação Física = âmbar, Fisioterapia = azul/primary, Avaliação = violeta, Terapia Manual = teal) e profissional. Ações Compareceu/Faltou/Remarcar só em itens `AGENDADO`.

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
- Desmarcar a tempo = `desmarcarAgendamentoPeloPaciente(agendamentoId, pacienteId)` seta `status: "CANCELADO"` (+ nota em `observacao`). Não há tabela/contador/cron de "crédito": a vaga do plano no mês reabre sozinha porque `contarAgendamentosNoMes` / `getConsumoPlanoPaciente` ignoram `CANCELADO`, e a janela mês-calendário faz o crédito não usado expirar na virada do mês. O paciente reagenda pelo botão "Agendar" que já existe.
- O lado da clínica **não** passa por essa regra — cancela/exclui/remarca livremente pelos fluxos existentes.

## Fuso horário — tudo em horário de Brasília

A clínica opera em `America/Sao_Paulo` e o sistema assume esse fuso em todo lugar (o Brasil não tem horário de verão desde 2019, offset fixo `-03:00`).

- **Entrada**: `combinarDataHora(data, hora)` (`src/lib/validations/agendamento.ts`) sempre anexa `-03:00` — o instante gravado não depende do fuso do processo (a Vercel roda em UTC).
- **Colunas de data/hora com hora relevante** usam `@db.Timestamptz(3)` (ex. `Agendamento.dataInicio/dataFim`) — guardam instante real, não timestamp naïve.
- **Runtime**: `next.config.ts` faz `process.env.TZ = process.env.APP_TIMEZONE ?? process.env.TZ ?? "America/Sao_Paulo"` (afeta RSC/server actions/date-fns). `TZ` é nome reservado na Vercel — não dá pra setar lá; o fallback hardcoded já cobre produção. Para trocar o fuso, use a env var `APP_TIMEZONE`.
- **Exibição**: `src/lib/format.ts` formata com `timeZone: "America/Sao_Paulo"` explícito (`formatarData`, `formatarDataHora`, `toDateInputValue`, `toTimeInputValue`, `horaDoDia`). Componentes client de calendário/dashboard também passam `timeZone` explícito nos `toLocale*`. Para agrupar evento por faixa horária use `horaDoDia(date)`, nunca `date.getHours()`.

## Seed

`npm run db:seed` cria o usuário admin padrão (`admin@admin.com` / `admin`).
