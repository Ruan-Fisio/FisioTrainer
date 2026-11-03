// Rascunho do modelo de exame como o formulário de cadastro o edita, e a
// conversão banco → rascunho. Compartilhado entre a página de edição, a
// sincronização em tempo real (actions/exames.ts) e o merge (exame-merge.ts).

import { coresPersistidasParaAlinhar } from "@/lib/cor-opcao";
import {
  normalizarTitulo,
  parseVariaveis,
  renomearEmAgregacoes,
  renomearForaDeAgregacoes,
  renomearReferenciaFormula,
  renomearSecaoEmFormula,
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

/** O que `SOMA({...})` pode alcançar: `Seção > Coluna` de cada seção com nome e
 * `Coluna` sozinha (exame inteiro), incluindo campos repetíveis. */
export function alvosDeAgregacao(secoes: SecaoDraft[]): string[] {
  const porSecao = new Map<string, string>();
  const porColuna = new Map<string, string>();
  for (const secao of secoes) {
    for (const campo of secao.campos) {
      for (const coluna of campo.colunas) {
        const titulo = coluna.titulo.trim();
        if (!titulo || !ehColunaNumerica(coluna)) continue;
        porColuna.set(normalizarTitulo(titulo), titulo);
        if (secao.nome.trim()) {
          const alvo = `${secao.nome.trim()} > ${titulo}`;
          porSecao.set(normalizarTitulo(alvo), alvo);
        }
      }
    }
  }
  return [...porSecao.values(), ...porColuna.values()];
}

function aplicarNasFormulas(
  coluna: ColunaDraft,
  renomear: (formula: string) => string,
): ColunaDraft {
  if (coluna.tipo === "CALCULADO" && coluna.formula) {
    return { ...coluna, formula: renomear(coluna.formula) };
  }
  if (coluna.tipo === "MULTIPLA_ESCOLHA" && coluna.opcoesCondicionais.length > 0) {
    return {
      ...coluna,
      opcoesCondicionais: coluna.opcoesCondicionais.map((c) => ({
        ...c,
        formula: renomear(c.formula),
      })),
    };
  }
  return coluna;
}

/** Outra coluna numérica ainda usa o título? Então a agregação por título segue
 * valendo para ela e não acompanha a renomeação. `secoes` já tem o título novo. */
export function tituloAindaEmUso(secoes: SecaoDraft[], titulo: string): boolean {
  const chave = normalizarTitulo(titulo);
  return secoes.some((secao) =>
    secao.campos.some((campo) =>
      campo.colunas.some(
        (c) => ehColunaNumerica(c) && normalizarTitulo(c.titulo) === chave,
      ),
    ),
  );
}

/** Renomear coluna também alcança as variáveis, a não ser que outra coluna numérica
 * tenha o título antigo (a variável pode estar falando dela). `secoes` é o estado
 * de antes da renomeação. */
export function renomearColunaNasVariaveis(
  secoes: SecaoDraft[],
  variaveis: VariavelExame[],
  antigo: string,
  novo: string,
  origem: { secaoIndex: number; campoIndex: number; colunaIndex: number },
): VariavelExame[] {
  const chave = normalizarTitulo(antigo);
  const emOutra = secoes.some((secao, si) =>
    secao.campos.some((campo, ci) =>
      campo.colunas.some(
        (c, coi) =>
          !(si === origem.secaoIndex && ci === origem.campoIndex && coi === origem.colunaIndex) &&
          ehColunaNumerica(c) &&
          normalizarTitulo(c.titulo) === chave,
      ),
    ),
  );
  if (emOutra) return variaveis;
  return variaveis.map((v) => ({
    ...v,
    formula: renomearReferenciaFormula(v.formula, antigo, novo),
  }));
}

/** Renomear seção: atualiza as agregações, nas colunas e nas variáveis. Outra seção
 * com o nome antigo mantém a agregação valendo para ela. */
export function renomearSecaoNasFormulas(
  secoes: SecaoDraft[],
  variaveis: VariavelExame[],
  antigo: string,
  novo: string,
): { secoes: SecaoDraft[]; variaveis: VariavelExame[] } {
  const chave = normalizarTitulo(antigo);
  if (secoes.some((s) => normalizarTitulo(s.nome) === chave)) return { secoes, variaveis };
  const renomear = (formula: string) => renomearSecaoEmFormula(formula, antigo, novo);
  return {
    secoes: secoes.map((secao) => ({
      ...secao,
      campos: secao.campos.map((campo) => ({
        ...campo,
        colunas: campo.colunas.map((coluna) => aplicarNasFormulas(coluna, renomear)),
      })),
    })),
    variaveis: variaveis.map((v) => ({ ...v, formula: renomear(v.formula) })),
  };
}

/**
 * Renomeia `{antigo}` → `{novo}` em toda fórmula e condição das colunas. Com
 * `origem` (a coluna renomeada, já com o título novo), respeita o escopo: coluna
 * de campo repetível só é citada no próprio campo, e um campo repetível com
 * coluna própria de mesmo nome não está citando a coluna renomeada. As agregações
 * alcançam a coluna de qualquer lugar, exceto se outra coluna ainda usa o título.
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
  const agregacoes = !origem || !tituloAindaEmUso(secoes, antigo);

  return secoes.map((secao, si) => ({
    ...secao,
    campos: secao.campos.map((campo, ci) => {
      const ehOrigem = origem?.secaoIndex === si && origem.campoIndex === ci;
      const temProprio =
        campo.repetivel &&
        campo.colunas.some(
          (c) => ehColunaNumerica(c) && normalizarTitulo(c.titulo) === chaveAntiga,
        );
      const diretas = !origem || ehOrigem || (!origemRepetivel && !temProprio);
      const renomear = (formula: string) => {
        if (diretas && agregacoes) return renomearReferenciaFormula(formula, antigo, novo);
        if (diretas) return renomearForaDeAgregacoes(formula, antigo, novo);
        return agregacoes ? renomearEmAgregacoes(formula, antigo, novo) : formula;
      };
      return {
        ...campo,
        colunas: campo.colunas.map((coluna) => aplicarNasFormulas(coluna, renomear)),
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
