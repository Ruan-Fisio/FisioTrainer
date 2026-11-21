# Biblioteca de movimento (goniometria)

- Rotas: `/biblioteca-movimento/goniometria` (listagem com busca e paginação, `novo`, `[id]`). Ações em `src/actions/movimentos.ts`.
- `Movimento`: `nome` (único, ≥ 2 caracteres) e `grauIdeal` (texto obrigatório, ex.: `"0-180"`). Duplicado retorna `"Já existe um movimento com este nome."`.
- **Importar CSV** (`importMovimentosCsv`): separador `,` ou `;`. Se a 1ª linha tiver colunas contendo "nome" e "grau", é cabeçalho; senão as colunas são nome, grau (0 e 1). Linhas sem nome ou grau são descartadas; nenhuma válida → erro.
- **Uso em exames**: campo do tipo `GONIOMETRIA` (`TipoCampoExame`). O valor gravado é um JSON `[{ nome, grauAlcancado, lado? }]`; ler sempre com `parseGoniometriaValor` (`src/lib/goniometria.ts`, tolera valor vazio/inválido), nunca `JSON.parse` direto. Componentes: `src/components/exame-execucoes/goniometria-field.tsx`. Regras gerais do exame em `docs/exames.md`.
- O catálogo é referência para o preenchimento; excluir um `Movimento` não altera execuções já gravadas (o nome fica no JSON).
