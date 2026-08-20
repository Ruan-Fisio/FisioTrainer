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
- **Abas** (`Tabs`/`TabsList`): lista de abas com overflow horizontal roll ável (`-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6` no wrapper, `w-max` na `TabsList`), como em `paciente-tabs.tsx` — nunca deixar abas quebrando linha ou cortadas sem scroll.
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

## Seed

`npm run db:seed` cria o usuário admin padrão (`admin@admin.com` / `admin`).
