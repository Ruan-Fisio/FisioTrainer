# Biblioteca de exercícios

Rotas: `/biblioteca/categorias` e `/biblioteca/exercicios` (listagem, `novo`, `[id]`, `[id]/editar`). Convenção de CRUD e filtros em `docs/ui-padroes.md`.

## Categoria
- `Categoria.name` é **único**; duplicado retorna `"Já existe uma categoria com este nome."`.
- `deleteCategoria` **bloqueia** exclusão de categoria em uso por algum exercício (`"Categoria em uso não pode ser excluída."`).

## Exercício
- Exige nome ≥ 2 caracteres, **≥ 1 categoria** e **≥ 1 link** (URL válida) — `src/lib/validations/exercicio.ts`. Os links são vídeos/imagens de referência (`ExercicioLink`).
- `updateExercicio` **recria todos os links** (`deleteMany` + `create`) e faz `categorias: set` numa `$transaction`: ids de link não são estáveis.
- Filtros da listagem na URL (`q`, categoria). Previews dos links: `src/components/exercicios/link-preview-grid.tsx` (`src/lib/link-preview.ts`).
- Exercício usado em treino (`TreinoDiaExercicio`) **não** tem `onDelete: Cascade`: excluir exercício em uso falha no banco. Ver `docs/treinos-evolucoes.md`.
- Página pública de um exercício: `/compartilhado/exercicios/[id]`.
