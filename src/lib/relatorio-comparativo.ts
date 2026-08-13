import { parseGoniometriaValor } from "@/lib/goniometria";

export type ExameParaComparativo = {
  secoes: {
    id: string;
    nome: string;
    campos: {
      id: string;
      nome: string;
      repetivel: boolean;
      colunas: {
        id: string;
        titulo: string;
        tipo: string;
        formatacao: string | null;
        valorIdeal: string | null;
        direcaoIdeal: string | null;
      }[];
    }[];
  }[];
};

export type ValorExecucao = { colunaId: string; valor: string; linha: number };

export type MovimentoIdeal = { nome: string; grauIdeal: string };

export type Classificacao = "proximo" | "moderado" | "distante";

export type LinhaComparativo = {
  chave: string;
  rotulo: string;
  contexto: string | null;
  unidade: string | null;
  valorIdeal: string | null;
  avaliacaoValor: string | null;
  avaliacaoDist: number | null;
  retornoValor: string | null;
  retornoDist: number | null;
  progresso: number | null;
  classificacaoAvaliacao: Classificacao | null;
};

export type SecaoComparativo = {
  id: string;
  nome: string;
  linhas: LinhaComparativo[];
};

function extrairNumeros(texto: string): number[] {
  // Lookbehind evita que o hífen de uma faixa como "60-100" seja lido
  // como sinal de negativo do segundo número (viraria 60 e -100).
  const matches = texto.match(/(?<!\d)-?\d+(?:[.,]\d+)?/g);
  if (!matches) return [];
  return matches.map((m) => parseFloat(m.replace(",", ".")));
}

export function parseNumero(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const numeros = extrairNumeros(texto);
  return numeros.length > 0 ? numeros[0] : null;
}

export function parseFaixaIdeal(
  texto: string | null | undefined,
): { min: number; max: number } | null {
  if (!texto) return null;
  const numeros = extrairNumeros(texto);
  if (numeros.length === 0) return null;
  if (numeros.length === 1) return { min: numeros[0], max: numeros[0] };
  return { min: Math.min(...numeros), max: Math.max(...numeros) };
}

export function calcularDistancia(
  valor: number,
  faixa: { min: number; max: number },
): number {
  if (valor < faixa.min) return valor - faixa.min;
  if (valor > faixa.max) return valor - faixa.max;
  return 0;
}

/**
 * Só para Goniometria: o grau ideal de um movimento é cadastrado como uma
 * amplitude com direção (ex: "0-145" x "145-0" descrevem o mesmo intervalo,
 * mas com sentidos opostos de evolução). O alvo é sempre o ÚLTIMO número da
 * string — é isso que faz a distância "virar" dependendo da ordem em que os
 * números foram cadastrados no grau ideal do movimento.
 */
export function parseAlvoGoniometria(
  texto: string | null | undefined,
): number | null {
  if (!texto) return null;
  const numeros = extrairNumeros(texto);
  return numeros.length > 0 ? numeros[numeros.length - 1] : null;
}

export function classificarDistancia(dist: number): Classificacao {
  const abs = Math.abs(dist);
  if (abs <= 5) return "proximo";
  if (abs <= 15) return "moderado";
  return "distante";
}

function calcularProgresso(
  direcao: string | null,
  avaliacaoValor: number,
  retornoValor: number,
  faixa: { min: number; max: number } | null,
): number | null {
  if (direcao === "MAIOR_MELHOR") return retornoValor - avaliacaoValor;
  if (direcao === "MENOR_MELHOR") return avaliacaoValor - retornoValor;
  if (!faixa) return null;
  const distAvaliacao = Math.abs(calcularDistancia(avaliacaoValor, faixa));
  const distRetorno = Math.abs(calcularDistancia(retornoValor, faixa));
  return distAvaliacao - distRetorno;
}

function valorMapPorChave(valores: ValorExecucao[]) {
  const mapa = new Map<string, string>();
  for (const v of valores) mapa.set(`${v.colunaId}::${v.linha}`, v.valor);
  return mapa;
}

function linhasDoCampo(
  campo: ExameParaComparativo["secoes"][number]["campos"][number],
  avaliacaoValores: ValorExecucao[],
  retornoValores: ValorExecucao[],
): number[] {
  if (!campo.repetivel) return [0];
  const colunaIds = new Set(campo.colunas.map((c) => c.id));
  const linhas = new Set<number>();
  for (const v of [...avaliacaoValores, ...retornoValores]) {
    if (colunaIds.has(v.colunaId)) linhas.add(v.linha);
  }
  return linhas.size > 0 ? Array.from(linhas).sort((a, b) => a - b) : [0];
}

export function montarComparativo(
  exame: ExameParaComparativo,
  avaliacaoValores: ValorExecucao[],
  retornoValores: ValorExecucao[],
  movimentos: MovimentoIdeal[],
): SecaoComparativo[] {
  const avalMap = valorMapPorChave(avaliacaoValores);
  const retMap = valorMapPorChave(retornoValores);
  const movimentoPorNome = new Map(movimentos.map((m) => [m.nome, m]));

  const secoesResultado: SecaoComparativo[] = [];

  for (const secao of exame.secoes) {
    const linhas: LinhaComparativo[] = [];

    for (const campo of secao.campos) {
      const numerosLinha = linhasDoCampo(campo, avaliacaoValores, retornoValores);

      for (const linha of numerosLinha) {
        const sufixoEntrada =
          campo.repetivel && numerosLinha.length > 1
            ? ` (entrada ${numerosLinha.indexOf(linha) + 1})`
            : "";

        for (const coluna of campo.colunas) {
          const chave = `${coluna.id}::${linha}`;
          const avalRaw = avalMap.get(chave) ?? "";
          const retRaw = retMap.get(chave) ?? "";

          if (coluna.tipo === "GONIOMETRIA") {
            const avalEntries = parseGoniometriaValor(avalRaw);
            const retEntries = parseGoniometriaValor(retRaw);
            const nomes = new Set([
              ...avalEntries.map((e) => e.nome),
              ...retEntries.map((e) => e.nome),
            ]);

            for (const nome of nomes) {
              const avalEntry = avalEntries.find((e) => e.nome === nome);
              const retEntry = retEntries.find((e) => e.nome === nome);
              const idealTexto = movimentoPorNome.get(nome)?.grauIdeal ?? null;
              const alvo = parseAlvoGoniometria(idealTexto);
              const avalNum = parseNumero(avalEntry?.grauAlcancado);
              const retNum = parseNumero(retEntry?.grauAlcancado);
              const avalDist =
                alvo !== null && avalNum !== null ? avalNum - alvo : null;
              const retDist =
                alvo !== null && retNum !== null ? retNum - alvo : null;
              const progresso =
                avalDist !== null && retDist !== null
                  ? Math.abs(avalDist) - Math.abs(retDist)
                  : null;

              linhas.push({
                chave: `${chave}::${nome}`,
                rotulo: nome,
                contexto: coluna.titulo,
                unidade: null,
                valorIdeal: idealTexto,
                avaliacaoValor: avalEntry?.grauAlcancado || null,
                avaliacaoDist: avalDist,
                retornoValor: retEntry?.grauAlcancado || null,
                retornoDist: retDist,
                progresso,
                classificacaoAvaliacao:
                  avalDist !== null ? classificarDistancia(avalDist) : null,
              });
            }
            continue;
          }

          if (!avalRaw && !retRaw) continue;

          const rotulo = campo.nome
            ? `${campo.nome} — ${coluna.titulo}${sufixoEntrada}`
            : `${coluna.titulo}${sufixoEntrada}`;

          let avalDist: number | null = null;
          let retDist: number | null = null;
          let progresso: number | null = null;
          const faixa =
            coluna.tipo === "NUMERO" ? parseFaixaIdeal(coluna.valorIdeal) : null;

          if (faixa) {
            const avalNum = parseNumero(avalRaw);
            const retNum = parseNumero(retRaw);
            avalDist = avalNum !== null ? calcularDistancia(avalNum, faixa) : null;
            retDist = retNum !== null ? calcularDistancia(retNum, faixa) : null;
            progresso =
              avalNum !== null && retNum !== null
                ? calcularProgresso(
                    coluna.direcaoIdeal,
                    avalNum,
                    retNum,
                    faixa,
                  )
                : null;
          }

          linhas.push({
            chave,
            rotulo,
            contexto: null,
            unidade: coluna.formatacao,
            valorIdeal: coluna.tipo === "NUMERO" ? coluna.valorIdeal : null,
            avaliacaoValor: avalRaw || null,
            avaliacaoDist: avalDist,
            retornoValor: retRaw || null,
            retornoDist: retDist,
            progresso,
            classificacaoAvaliacao:
              avalDist !== null ? classificarDistancia(avalDist) : null,
          });
        }
      }
    }

    if (linhas.length > 0) {
      secoesResultado.push({ id: secao.id, nome: secao.nome, linhas });
    }
  }

  return secoesResultado;
}
