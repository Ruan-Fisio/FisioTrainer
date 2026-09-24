import { parseNumero } from "@/lib/relatorio-comparativo";

export type ComparacaoRapidaColuna = {
  id: string;
  titulo: string;
  ordem: number;
  tipo: string;
  formatacao?: string | null;
  multiplaSelecao: boolean;
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
 * série por coluna do tipo NUMERO — pra desenhar um gráfico de linha da
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
      if (linha.coluna.tipo !== "NUMERO") continue;

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
