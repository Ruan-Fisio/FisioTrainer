import {
  calcularColunasFormula,
  formatarNumeroFormula,
  type DadosPacienteFormula,
  type VariavelExame,
} from "@/lib/exame-formula";
import { parsePontuacoes } from "@/lib/pontuacao-opcao";
import { parseNumero } from "@/lib/relatorio-comparativo";

export type ComparacaoRapidaColuna = {
  id: string;
  titulo: string;
  ordem: number;
  tipo: string;
  formatacao?: string | null;
  multiplaSelecao: boolean;
  /** `ExameCampoColuna.coresOpcoes` (Json); opcional — sem cor = sem destaque. */
  coresOpcoes?: unknown;
};

export type ComparacaoRapidaCampo = {
  id: string;
  nome: string;
  ordem: number;
  repetivel: boolean;
  colunas: ComparacaoRapidaColuna[];
};

export type ComparacaoRapidaSecao = {
  id: string;
  nome: string;
  ordem: number;
  campos: ComparacaoRapidaCampo[];
};

export type ComparacaoRapidaExame = {
  secoes: ComparacaoRapidaSecao[];
};

export type ComparacaoRapidaValor = {
  colunaId: string;
  linha: number;
  valor: string;
};

export type ComparacaoRapidaExecucao = {
  id: string;
  valores: ComparacaoRapidaValor[];
};

export type LinhaComparacaoRapida = {
  campoId: string;
  campoNome: string;
  linha: number;
  repetivel: boolean;
  coluna: ComparacaoRapidaColuna;
  valoresPorExecucaoId: Map<string, string | undefined>;
};

export type SecaoComparacaoRapida = {
  id: string;
  nome: string;
  linhas: LinhaComparacaoRapida[];
};

function linhasDoCampo(
  campo: ComparacaoRapidaCampo,
  execucoes: ComparacaoRapidaExecucao[],
): number[] {
  if (!campo.repetivel) return [0];

  const colunaIds = new Set(campo.colunas.map((c) => c.id));
  const linhas = new Set<number>();
  for (const execucao of execucoes) {
    for (const v of execucao.valores) {
      if (colunaIds.has(v.colunaId)) linhas.add(v.linha);
    }
  }

  return linhas.size > 0 ? Array.from(linhas).sort((a, b) => a - b) : [0];
}

export type ExameParaCalculo = {
  secoes: {
    campos: {
      repetivel: boolean;
      colunas: {
        id: string;
        titulo: string;
        tipo: string;
        formula?: string | null;
        opcoes?: string[];
        multiplaSelecao?: boolean;
        /** `ExameCampoColuna.pontuacoes` (Json). */
        pontuacoes?: unknown;
      }[];
    }[];
  }[];
};

/**
 * Colunas CALCULADO nunca são gravadas (ver `exame-formula.ts`), então a
 * comparação — que só enxerga `ExameExecucaoValor` — as mostraria vazias.
 * Recalcula cada coluna calculada, execução por execução (mesma regra do
 * detalhe da execução), e devolve os valores com ela acrescentada na linha 0,
 * já formatada. Cálculo com erro (dado de origem faltando) fica sem valor.
 */
export function acrescentarValoresCalculados<
  E extends { valores: ComparacaoRapidaValor[] },
>(
  exame: ExameParaCalculo,
  execucoes: E[],
  paciente?: DadosPacienteFormula | null,
  variaveis?: VariavelExame[],
): E[] {
  const colunas = exame.secoes.flatMap((secao) =>
    secao.campos.flatMap((campo) =>
      campo.colunas.map((coluna) => ({
        id: coluna.id,
        titulo: coluna.titulo,
        tipo: coluna.tipo,
        formula: coluna.formula,
        repetivel: campo.repetivel,
        opcoes: coluna.opcoes,
        multiplaSelecao: coluna.multiplaSelecao,
        pontuacoes: parsePontuacoes(coluna.pontuacoes),
      })),
    ),
  );
  if (!colunas.some((c) => c.tipo === "CALCULADO")) return execucoes;

  return execucoes.map((execucao) => {
    const brutos = new Map(
      execucao.valores
        .filter((v) => v.linha === 0)
        .map((v) => [v.colunaId, v.valor]),
    );
    const calculados = calcularColunasFormula(
      colunas,
      (colunaId) => brutos.get(colunaId),
      paciente,
      variaveis,
    );

    const extras: ComparacaoRapidaValor[] = [];
    for (const [colunaId, resultado] of calculados) {
      if ("valor" in resultado) {
        extras.push({ colunaId, linha: 0, valor: formatarNumeroFormula(resultado.valor) });
      }
    }
    return { ...execucao, valores: [...execucao.valores, ...extras] };
  });
}

/**
 * Organiza os valores brutos de N execuções (Avaliação + Retornos) do mesmo
 * exame numa lista de linhas por seção, uma linha por (campo, linha, coluna) —
 * pronta pra desenhar uma tabela com colunas = execuções. Não formata o
 * valor (isso fica pro renderer de cada tipo de coluna).
 */
export function montarLinhasComparacaoRapida(
  exame: ComparacaoRapidaExame,
  execucoes: ComparacaoRapidaExecucao[],
): SecaoComparacaoRapida[] {
  const valorPorChaveExecucao = new Map<string, Map<string, string>>();
  for (const execucao of execucoes) {
    const chave = new Map<string, string>();
    for (const v of execucao.valores) {
      chave.set(`${v.colunaId}::${v.linha}`, v.valor);
    }
    valorPorChaveExecucao.set(execucao.id, chave);
  }

  return exame.secoes.map((secao) => {
    const linhas: LinhaComparacaoRapida[] = [];

    for (const campo of secao.campos) {
      const linhasDoCampoAtual = linhasDoCampo(campo, execucoes);
      for (const linha of linhasDoCampoAtual) {
        for (const coluna of campo.colunas) {
          const valoresPorExecucaoId = new Map<string, string | undefined>();
          for (const execucao of execucoes) {
            const valor = valorPorChaveExecucao
              .get(execucao.id)
              ?.get(`${coluna.id}::${linha}`);
            valoresPorExecucaoId.set(execucao.id, valor);
          }

          linhas.push({
            campoId: campo.id,
            campoNome: campo.nome,
            linha,
            repetivel: campo.repetivel,
            coluna,
            valoresPorExecucaoId,
          });
        }
      }
    }

    return { id: secao.id, nome: secao.nome, linhas };
  });
}

export const MAX_CAMPOS_GRAFICO = 4;

export type ResumoSerie = {
  inicial: number;
  final: number;
  delta: number;
  /** null quando o valor inicial é 0 (percentual indefinido). */
  percentual: number | null;
  direcao: "alta" | "queda" | "estavel";
};

/**
 * Variação entre o primeiro e o último valor preenchido da série — alimenta
 * o painel "Evolução no período" do card. null se há menos de 2 valores.
 */
export function resumirSerie(pontos: { valor: number | null }[]): ResumoSerie | null {
  const valores = pontos.map((p) => p.valor).filter((v): v is number => v !== null);
  if (valores.length < 2) return null;

  const inicial = valores[0];
  const final = valores[valores.length - 1];
  const delta = Math.round((final - inicial) * 100) / 100;
  const percentual =
    inicial === 0 ? null : Math.round(((final - inicial) / Math.abs(inicial)) * 100);

  return {
    inicial,
    final,
    delta,
    percentual,
    direcao: delta > 0 ? "alta" : delta < 0 ? "queda" : "estavel",
  };
}

export type SerieNumericaPonto = {
  execucaoId: string;
  valor: number | null;
};

export type SerieNumerica = {
  chave: string;
  titulo: string;
  unidade: string | null;
  pontos: SerieNumericaPonto[];
};

/**
 * Extrai, das linhas já montadas por `montarLinhasComparacaoRapida`, uma
 * série por coluna do tipo NUMERO ou CALCULADO — pra desenhar um gráfico de linha da
 * evolução daquele valor ao longo das execuções selecionadas. Ignora
 * colunas sem nenhum valor numérico em nenhuma execução (nada pra
 * mostrar). Não usa `numeroParaGrafico` (que também deriva número de
 * SIM_NAO/múltipla escolha) — aqui só o que é literalmente numérico.
 */
export function montarSeriesNumericas(
  secoes: SecaoComparacaoRapida[],
  execucaoIds: string[],
): SerieNumerica[] {
  const series: SerieNumerica[] = [];

  for (const secao of secoes) {
    for (const linha of secao.linhas) {
      if (linha.coluna.tipo !== "NUMERO" && linha.coluna.tipo !== "CALCULADO") continue;

      const pontos = execucaoIds.map((execucaoId) => ({
        execucaoId,
        valor: parseNumero(linha.valoresPorExecucaoId.get(execucaoId)),
      }));

      if (pontos.every((p) => p.valor === null)) continue;

      const titulo = linha.campoNome
        ? `${linha.campoNome} — ${linha.coluna.titulo}`
        : linha.coluna.titulo;

      series.push({
        chave: `${linha.coluna.id}::${linha.linha}`,
        titulo: linha.repetivel ? `${titulo} (Entrada ${linha.linha + 1})` : titulo,
        unidade: linha.coluna.formatacao ?? null,
        pontos,
      });
    }
  }

  return series;
}

/**
 * Filtra as séries pelas chaves escolhidas, na ordem da escolha, limitado a
 * MAX_CAMPOS_GRAFICO. `chaves` null = sem filtro (todas as séries).
 */
export function filtrarSeriesPorChaves(
  series: SerieNumerica[],
  chaves: string[] | null,
): SerieNumerica[] {
  if (chaves === null) return series;
  const porChave = new Map(series.map((s) => [s.chave, s]));
  const escolhidas: SerieNumerica[] = [];
  for (const chave of chaves) {
    const serie = porChave.get(chave);
    if (serie && !escolhidas.includes(serie)) escolhidas.push(serie);
    if (escolhidas.length >= MAX_CAMPOS_GRAFICO) break;
  }
  return escolhidas;
}
