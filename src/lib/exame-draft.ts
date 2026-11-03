// Rascunho do modelo de exame como o formulário de cadastro o edita, e a
// conversão banco → rascunho. Compartilhado entre a página de edição, a
// sincronização em tempo real (actions/exames.ts) e o merge (exame-merge.ts).

import { coresPersistidasParaAlinhar } from "@/lib/cor-opcao";
import {
  normalizarTitulo,
  parseVariaveis,
  renomearReferenciaFormula,
  type VariavelExame,
} from "@/lib/exame-formula";
import {
  parsePontuacoes,
  pontuacoesPersistidasParaAlinhar,
} from "@/lib/pontuacao-opcao";
import { parseTabelas, type TabelaReferencia } from "@/lib/tabela-referencia";

export type TipoColunaDraft =
  | "NUMERO"
  | "TEXTO"
  | "MULTIPLA_ESCOLHA"
  | "SIM_NAO"
  | "GONIOMETRIA"
  | "CALCULADO";
export type DirecaoIdealDraft = "MAIOR_MELHOR" | "MENOR_MELHOR" | "PROXIMO_IDEAL";

export type ColunaDraft = {
  id?: string;
  titulo: string;
  tipo: TipoColunaDraft;
  formatacao: string;
  opcoes: string[];
  multiplaSelecao: boolean;
  opcoesCondicionais: { opcao: string; formula: string }[];
  /** Cor de destaque por opção, alinhada por índice com `opcoes` ("" = sem cor). */
  coresOpcoes: string[];
  /** Cada opção vale um número fixo, referenciável em fórmulas como `{Coluna}`. */
  usaPontuacao: boolean;
  /** Pontos por opção (texto, alinhado por índice com `opcoes`; "" = sem). */
  pontuacoes: string[];
  /** A coluna aceita anexos (arquivos) na execução do exame. */
  permiteAnexo: boolean;
  valorIdeal: string;
  direcaoIdeal: DirecaoIdealDraft;
  formula: string;
};
export type CampoDraft = {
  id?: string;
  nome: string;
  repetivel: boolean;
  identificarMembro: boolean;
  colunas: ColunaDraft[];
};
export type SecaoDraft = { id?: string; nome: string; campos: CampoDraft[] };

function ehColunaNumerica(coluna: ColunaDraft): boolean {
  return (
    coluna.tipo === "NUMERO" ||
    coluna.tipo === "CALCULADO" ||
    (coluna.tipo === "MULTIPLA_ESCOLHA" && coluna.usaPontuacao)
  );
}

/** Nomes que a fórmula de uma coluna pode referenciar (ver src/lib/exame-formula.ts):
 * colunas Número/Calculado/Pontuação de campos não-repetíveis de todo o exame
 * (antes ou depois) e as do próprio campo, mesmo repetível — exceto a própria coluna. */
export function colunasReferenciaveis(
  secoes: SecaoDraft[],
  secaoIndex: number,
  campoIndex: number,
  colunaIndex: number,
): string[] {
  const nomes = new Map<string, string>();
  secoes.forEach((secao, si) =>
    secao.campos.forEach((campo, ci) =>
      campo.colunas.forEach((coluna, coi) => {
        const mesmoCampo = si === secaoIndex && ci === campoIndex;
        const propria = mesmoCampo && coi === colunaIndex;
        if (
          !propria &&
          (!campo.repetivel || mesmoCampo) &&
          ehColunaNumerica(coluna) &&
          coluna.titulo.trim()
        ) {
          nomes.set(normalizarTitulo(coluna.titulo), coluna.titulo.trim());
        }
      }),
    ),
  );
  return [...nomes.values()];
}

/**
 * Renomeia `{antigo}` → `{novo}` em toda fórmula e condição das colunas. Com
 * `origem` (a coluna renomeada, já com o título novo), respeita o escopo: coluna
 * de campo repetível só é citada no próprio campo, e um campo repetível com
 * coluna própria de mesmo nome não está citando a coluna renomeada.
 */
export function renomearReferenciaEmSecoes(
  secoes: SecaoDraft[],
  antigo: string,
  novo: string,
  origem?: { secaoIndex: number; campoIndex: number },
): SecaoDraft[] {
  const origemRepetivel =
    origem && secoes[origem.secaoIndex]?.campos[origem.campoIndex]?.repetivel;
  const chaveAntiga = normalizarTitulo(antigo);

  return secoes.map((secao, si) => ({
    ...secao,
    campos: secao.campos.map((campo, ci) => {
      const ehOrigem = origem?.secaoIndex === si && origem.campoIndex === ci;
      if (origem && !ehOrigem) {
        if (origemRepetivel) return campo;
        const temProprio =
          campo.repetivel &&
          campo.colunas.some(
            (c) => ehColunaNumerica(c) && normalizarTitulo(c.titulo) === chaveAntiga,
          );
        if (temProprio) return campo;
      }
      return {
        ...campo,
        colunas: campo.colunas.map((coluna) => {
          if (coluna.tipo === "CALCULADO" && coluna.formula) {
            return {
              ...coluna,
              formula: renomearReferenciaFormula(coluna.formula, antigo, novo),
            };
          }
          if (
            coluna.tipo === "MULTIPLA_ESCOLHA" &&
            coluna.opcoesCondicionais.length > 0
          ) {
            return {
              ...coluna,
              opcoesCondicionais: coluna.opcoesCondicionais.map((c) => ({
                ...c,
                formula: renomearReferenciaFormula(c.formula, antigo, novo),
              })),
            };
          }
          return coluna;
        }),
      };
    }),
  }));
}

export type ExameDraft = {
  nome: string;
  descricao: string;
  tipo: "FISIOTERAPIA" | "EDUCACAO_FISICA";
  sombra: boolean;
  variaveis: VariavelExame[];
  tabelas: TabelaReferencia[];
  secoes: SecaoDraft[];
};

/** Id para item criado no formulário (seção/campo/coluna/tabela): estável desde
 * a criação, para o merge reconhecer o item antes e depois de gravado. */
export function novoIdLocal(): string {
  return crypto.randomUUID();
}

type ColunaBanco = {
  id: string;
  titulo: string;
  tipo: string;
  formatacao: string | null;
  opcoes: string[];
  multiplaSelecao: boolean;
  opcoesCondicionais: unknown;
  coresOpcoes: unknown;
  pontuacoes: unknown;
  permiteAnexo: boolean;
  valorIdeal: string | null;
  direcaoIdeal: string | null;
  formula: string | null;
};

type ExameBanco = {
  nome: string;
  descricao: string | null;
  tipo: "FISIOTERAPIA" | "EDUCACAO_FISICA";
  sombra: boolean;
  variaveis: unknown;
  tabelas: unknown;
  secoes: {
    id: string;
    nome: string;
    campos: {
      id: string;
      nome: string;
      repetivel: boolean;
      identificarMembro: boolean;
      colunas: ColunaBanco[];
    }[];
  }[];
};

/** Exame do banco (seções/campos/colunas já ordenados) → rascunho do form. A
 * coluna "Membro" fica de fora: é injetada pelo server. */
export function exameParaDraft(exame: ExameBanco): ExameDraft {
  return {
    nome: exame.nome,
    descricao: exame.descricao ?? "",
    tipo: exame.tipo,
    sombra: exame.sombra,
    variaveis: parseVariaveis(exame.variaveis),
    tabelas: parseTabelas(exame.tabelas),
    secoes: exame.secoes.map((secao) => ({
      id: secao.id,
      nome: secao.nome,
      campos: secao.campos.map((campo) => ({
        id: campo.id,
        nome: campo.nome,
        repetivel: campo.repetivel,
        identificarMembro: campo.identificarMembro,
        colunas: campo.colunas
          .filter((coluna) => coluna.tipo !== "MEMBRO")
          .map((coluna) => ({
            id: coluna.id,
            titulo: coluna.titulo,
            tipo: coluna.tipo as TipoColunaDraft,
            formatacao: coluna.formatacao ?? "",
            opcoes: coluna.opcoes,
            multiplaSelecao: coluna.multiplaSelecao,
            opcoesCondicionais: Array.isArray(coluna.opcoesCondicionais)
              ? (coluna.opcoesCondicionais as { opcao: string; formula: string }[])
              : [],
            coresOpcoes: coresPersistidasParaAlinhar(coluna.opcoes, coluna.coresOpcoes),
            usaPontuacao: parsePontuacoes(coluna.pontuacoes).length > 0,
            pontuacoes: pontuacoesPersistidasParaAlinhar(coluna.opcoes, coluna.pontuacoes),
            permiteAnexo: coluna.permiteAnexo,
            valorIdeal: coluna.valorIdeal ?? "",
            direcaoIdeal: (coluna.direcaoIdeal ?? "PROXIMO_IDEAL") as DirecaoIdealDraft,
            formula: coluna.formula ?? "",
          })),
      })),
    })),
  };
}
