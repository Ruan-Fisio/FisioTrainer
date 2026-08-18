# FisioTrainer

Aplicação fullstack para um fisioterapeuta gerenciar sua clínica (usuários, biblioteca de exercícios, e módulos futuros: pacientes, consultas, agenda).

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

## Campos MULTIPLA_ESCOLHA (exames) — nunca serializar seleção com vírgula

O texto das opções de uma coluna `MULTIPLA_ESCOLHA` (ex. "Positivo = Reprodução da dor, irradiação ou fraqueza") é livre e pode conter vírgula. Um bug real: no formulário de execução de exame, a seleção (única ou múltipla) era serializada/comparada com `valor.split(",")`/`.join(",")`, então uma opção com vírgula no próprio texto quebrava o parse e nunca aparecia marcada (o radio "Positivo" não marcava, só "Negativo", que não tinha vírgula).

- Use sempre `src/lib/multipla-escolha.ts` (`parseSelecionadas`, `serializeSelecionadas`, `toggleSelecionada`) para ler/gravar o valor de colunas `MULTIPLA_ESCOLHA` com `multiplaSelecao: true` — nunca `split(",")`/`join(",")` direto.
- Para seleção única (`multiplaSelecao: false`), o valor é a própria string da opção — compare com `valorAtual === opcao`, nunca quebre por vírgula.
- Testes de regressão para esses edge cases (opção com vírgula, dado legado sem o novo delimitador, roundtrip) estão em `src/lib/multipla-escolha.test.ts`. Rodar com `npm test`.

## Seed

`npm run db:seed` cria o usuário admin padrão (`admin@admin.com` / `admin`).
