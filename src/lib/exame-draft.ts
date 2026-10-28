// Rascunho do modelo de exame como o formulário de cadastro o edita, e a
// conversão banco → rascunho. Compartilhado entre a página de edição, a
// sincronização em tempo real (actions/exames.ts) e o merge (exame-merge.ts).

import { coresPersistidasParaAlinhar } from "@/lib/cor-opcao";
import { parseVariaveis, type VariavelExame } from "@/lib/exame-formula";
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
