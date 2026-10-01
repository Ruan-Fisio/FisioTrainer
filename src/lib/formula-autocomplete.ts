/**
 * Autocomplete do editor de fórmulas (estilo VS Code): dado o texto e a posição
 * do cursor, descobre o trecho que está sendo digitado (`{Pe`, `Pe`, `SE`) e
 * filtra as sugestões (colunas, variáveis, perfil do paciente, funções).
 * Lógica pura — a UI só renderiza a lista e aplica `aplicarSugestao`.
 */

export type TipoSugestao = "coluna" | "variavel" | "paciente" | "funcao";

export type Sugestao = {
  tipo: TipoSugestao;
  rotulo: string;
  /** Texto inserido no lugar do trecho digitado. */
  insercao: string;
  /** Onde fica o cursor dentro de `insercao` (padrão: no fim). */
  cursorNaInsercao?: number;
  detalhe?: string;
};

export type TokenAtual = { inicio: number; fim: number; prefixo: string };

const CARACTERE_PALAVRA = /[\p{L}\p{N}_]/u;

/** Trecho sendo digitado: dentro de `{...` aberto, ou uma palavra colada ao cursor. */
export function tokenNoCursor(texto: string, cursor: number): TokenAtual | null {
  const abertura = texto.lastIndexOf("{", cursor - 1);
  const fechamentoAntes = texto.lastIndexOf("}", cursor - 1);
  if (abertura !== -1 && abertura > fechamentoAntes) {
    const fim = texto[cursor] === "}" ? cursor + 1 : cursor;
    return { inicio: abertura, fim, prefixo: texto.slice(abertura + 1, cursor) };
  }

  let inicio = cursor;
  while (inicio > 0 && CARACTERE_PALAVRA.test(texto[inicio - 1])) inicio--;
  if (inicio === cursor) return null;
  // Número puro (ex. "18" de "18.5") não é nome a completar.
  if (/^\d+$/.test(texto.slice(inicio, cursor))) return null;
  return { inicio, fim: cursor, prefixo: texto.slice(inicio, cursor) };
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Prefixo primeiro, depois "contém"; no máximo `limite` itens. */
export function filtrarSugestoes(
  prefixo: string,
  itens: Sugestao[],
  limite = 8,
): Sugestao[] {
  const alvo = normalizar(prefixo);
  const comecam: Sugestao[] = [];
  const contem: Sugestao[] = [];
  for (const item of itens) {
    const nome = normalizar(item.rotulo);
    if (nome.startsWith(alvo)) comecam.push(item);
    else if (alvo && nome.includes(alvo)) contem.push(item);
  }
  return [...comecam, ...contem].slice(0, limite);
}

export function aplicarSugestao(
  texto: string,
  token: TokenAtual,
  sugestao: Sugestao,
): { texto: string; cursor: number } {
  const novo = texto.slice(0, token.inicio) + sugestao.insercao + texto.slice(token.fim);
  return {
    texto: novo,
    cursor: token.inicio + (sugestao.cursorNaInsercao ?? sugestao.insercao.length),
  };
}

export const SUGESTAO_SE: Sugestao = {
  tipo: "funcao",
  rotulo: "SE",
  insercao: "SE(; ; )",
  cursorNaInsercao: 3,
  detalhe: "SE(condição; se verdadeiro; se falso)",
};
