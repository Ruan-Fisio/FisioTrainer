# 005 — Impressão individual da avaliação (exame)
Status: implementado

## Spec
### Problema
Hoje só dá para imprimir um exame pelo relatório comparativo (`/comparar` → "Baixar PDF"), que exige uma avaliação **com retorno**. Logo após a primeira avaliação não há como imprimir o que foi registrado. O fisio quer um botão de impressora em qualquer execução para imprimir só ela.

### Critérios de aceite
- **CA1** Dada uma execução de exame (Avaliação, com ou sem retornos, ou Retorno), quando abro o detalhe (`/pacientes/[id]/exames/[execucaoId]`), então vejo um botão **Imprimir** (ícone de impressora).
- **CA2** Quando clico em Imprimir, então abre em nova aba um PDF com o mesmo cabeçalho do relatório comparativo (logo, título por tipo de exame, dados do paciente, histórico clínico, carimbo do profissional) e uma seção **Sessão** com exame, tipo (Avaliação/Retorno) e data.
- **CA3** As tabelas do PDF têm só uma coluna de valor (**Valor**), mais **Ideal** e **Dist.** quando a seção tem valor ideal — sem colunas de retorno/progresso. Só entram campos preenchidos; CALCULADO é recalculado; Goniometria lista cada movimento com o grau ideal.
- **CA4** Os gráficos consolidados mostram uma barra por item (só a execução impressa), com título "Gráficos Consolidados".
- **CA5** O relatório comparativo (`/comparar` e seu PDF) continua igual.
- **CA6** (adendo) No fim do PDF individual entram as **imagens** da execução, com as **anotações** desenhadas por cima, na ordem do exame e legendadas por seção/campo/coluna; anexos que não são imagem (ou imagem ilegível) aparecem só pelo nome em "Outros anexos".

### Regras de negócio
- **RN1** A rota do PDF exige sessão da clínica (não é exposta no portal).
- **RN2** Retorno usa o exame (versão) da própria execução — o mesmo que o detalhe mostra.

### Fora de escopo
- Impressão individual no portal público.

## Plano
### Abordagem
Reaproveitar `montarComparativo` passando os valores da execução como "avaliação" e lista vazia como retorno (as linhas só entram se houver valor). Nova função pura `montarRelatorioIndividual` + `montarSessaoIndividual` em `relatorio-comparativo.ts`. `RelatorioPdfDocument` ganha `modo: "comparativo" | "individual"` que esconde as colunas de retorno/progresso e ajusta títulos. Nova action `getRelatorioIndividual` e rota `GET /api/execucoes/[execucaoId]/relatorio-individual`. Botão `ImprimirExecucaoButton` no cabeçalho do detalhe.

### Dados
Nenhuma.

### Arquivos
| Arquivo | Mudança | Cobre |
|---|---|---|
| `src/lib/relatorio-comparativo.ts` | `montarRelatorioIndividual`, `montarSessaoIndividual` | CA2, CA3 |
| `src/lib/pdf/relatorio-documento.tsx` | prop `modo` (colunas, legenda dos gráficos) | CA3, CA4, CA5 |
| `src/actions/exame-execucoes.ts` | `getRelatorioIndividual` | CA2, RN2 |
| `src/app/api/execucoes/[execucaoId]/relatorio-individual/route.ts` | rota do PDF | CA2, RN1 |
| `src/components/exame-execucoes/imprimir-execucao-button.tsx` | botão | CA1 |
| `src/app/(app)/pacientes/[id]/exames/[execucaoId]/page.tsx` | usa o botão; ações com `flex-wrap` | CA1 |

### Testes
- Unit: `src/lib/relatorio-comparativo.test.ts` — individual só traz campos preenchidos, campos de retorno nulos, distância ao ideal calculada, Goniometria; sessão individual (CA3, RN2).
- E2E: não — fluxo é abrir um PDF em nova aba; coberto por unit + build.

### Riscos
- Mudar `RelatorioPdfDocument` afetar o comparativo: `modo` tem default `"comparativo"`.

## Tarefas
- [x] T1 Funções puras + testes — `src/lib/relatorio-comparativo.ts` (CA2, CA3)
- [x] T2 Modo individual no PDF — `src/lib/pdf/relatorio-documento.tsx` (CA3, CA4, CA5)
- [x] T3 Action + rota — `src/actions/exame-execucoes.ts`, `api/.../relatorio-individual` (CA2, RN1, RN2)
- [x] T4 Botão no detalhe — `imprimir-execucao-button.tsx`, `page.tsx` (CA1)
- [x] T5 Verificar: `npm test`, `npx tsc --noEmit`, `npx next build`
- [x] T6 Atualizar `docs/exames.md` com as regras duráveis
- [x] T7 (CA6) Ordenar/legendar anexos — `src/lib/relatorio-imagens.ts` + teste
- [x] T8 (CA6) Anotações no PDF reaproveitando `FormaSvg` — `src/lib/svg-arvore.ts` + teste, `src/lib/pdf/anotacoes-pdf.tsx`
- [x] T9 (CA6) Carregar imagens (storage + sharp) e seção "Imagens"/"Outros anexos" — `src/lib/pdf/imagens-relatorio.ts`, `relatorio-documento.tsx`, action e rota
