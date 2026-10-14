// Pontuação de uma opção de MULTIPLA_ESCOLHA: cada opção vale um número fixo e
// a coluna passa a ser referenciável em fórmulas (`{Coluna}` = soma dos pontos
// das opções marcadas). Persistido em `ExameCampoColuna.pontuacoes` (`Json`:
// `{opcao, pontos}[]`); coluna sem entradas = sem pontuação. Chaveado pelo
// texto da opção, como os valores gravados. Nunca é gravado na execução.

import { parseSelecionadas } from "@/lib/multipla-escolha";

export type OpcaoPontuada = { opcao: string; pontos: number };

/** Texto digitado → número. Aceita vírgula decimal ("1,5"); vazio/inválido → `null`. */
export function parsePontosTexto(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(limpo)) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

/** `pontuacoes` vem do Prisma como `Json` (`unknown` pro TS) — normaliza,
 * tratando null/formato inesperado/pontos não finitos como "sem pontuação". */
export function parsePontuacoes(valor: unknown): OpcaoPontuada[] {
  if (!Array.isArray(valor)) return [];
  const resultado: OpcaoPontuada[] = [];
  for (const item of valor) {
    if (typeof item !== "object" || item === null) continue;
    const { opcao, pontos } = item as { opcao?: unknown; pontos?: unknown };
    if (typeof opcao === "string" && typeof pontos === "number" && Number.isFinite(pontos)) {
      resultado.push({ opcao, pontos });
    }
  }
  return resultado;
}

/** Opção → pontos, pronto pra consulta na hora de renderizar/calcular. */
export function mapaPontuacoes(valor: unknown): Map<string, number> {
  return new Map(parsePontuacoes(valor).map((p) => [p.opcao, p.pontos]));
}

/**
 * Do formato do formulário (textos alinhados por índice com `opcoes`) para o
 * persistido. Opção vazia/repetida e pontos inválidos são descartados.
 */
export function pontuacoesAlinhadasParaPersistir(
  opcoes: string[],
  textos: string[],
): OpcaoPontuada[] {
  const vistos = new Set<string>();
  const resultado: OpcaoPontuada[] = [];
  opcoes.forEach((opcao, i) => {
    if (!opcao || vistos.has(opcao)) return;
    const pontos = parsePontosTexto(textos[i] ?? "");
    if (pontos === null) return;
    vistos.add(opcao);
    resultado.push({ opcao, pontos });
  });
  return resultado;
}

/** Inverso de `pontuacoesAlinhadasParaPersistir`: textos alinhados com `opcoes`. */
export function pontuacoesPersistidasParaAlinhar(
  opcoes: string[],
  valor: unknown,
): string[] {
  const mapa = mapaPontuacoes(valor);
  return opcoes.map((opcao) => {
    const pontos = mapa.get(opcao);
    return pontos === undefined ? "" : String(pontos);
  });
}

/**
 * Soma dos pontos das opções marcadas. `selecionadas` vazia → `undefined`
 * (sem resposta = sem valor, não zero). Opção marcada sem pontuação cadastrada
 * (ex. opção removida do exame) é ignorada; se nenhuma tiver pontos → `undefined`.
 */
export function somarPontuacao(
  selecionadas: string[],
  pontuacoes: OpcaoPontuada[],
): number | undefined {
  const mapa = new Map(pontuacoes.map((p) => [p.opcao, p.pontos]));
  let soma = 0;
  let achou = false;
  for (const opcao of selecionadas) {
    const pontos = mapa.get(opcao);
    if (pontos === undefined) continue;
    soma += pontos;
    achou = true;
  }
  return achou ? soma : undefined;
}

/** Opções marcadas de uma coluna a partir do valor gravado (única ou múltipla). */
export function selecionadasDoValor(valor: string, multiplaSelecao: boolean): string[] {
  if (!valor) return [];
  return (multiplaSelecao ? parseSelecionadas(valor) : [valor]).filter(Boolean);
}
