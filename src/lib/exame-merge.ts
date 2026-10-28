// Merge de três vias do rascunho do exame, para a edição em tempo real: duas
// pessoas editando o mesmo modelo não apagam o trabalho uma da outra.
//
// - `base`: o exame como estava da última vez que este cliente sincronizou;
// - `minha`: o rascunho local (o que esta pessoa editou desde a base);
// - `deles`: o que está gravado agora (com o que os outros salvaram).
//
// Entra no resultado o que `minha` mudou em relação à base; o resto vem de
// `deles`. Se os dois mudaram a mesma coisa, vence `minha` — é o salvamento
// mais recente. Só conta como mudança o que tem valor diferente da base —
// mandar o exame (ou a tabela) inteiro com valores iguais não muda nada.
// Unidades de conflito: cada campo simples do exame, cada seção/campo/coluna
// (por id, campo a campo), cada célula das tabelas de referência (ver
// `mesclarTabela`) e a lista de variáveis inteira. As opções de uma coluna de
// múltipla escolha (opções, cores, pontos, condições) andam juntas, porque são
// alinhadas por índice. O resultado pode ser inválido quando as mudanças se
// cruzam (ex. coluna renomeada × fórmula nova com o nome antigo): quem chama
// valida antes de gravar.

import type {
  CampoDraft,
  ColunaDraft,
  ExameDraft,
  SecaoDraft,
} from "@/lib/exame-draft";
import { idTabela, type TabelaReferencia } from "@/lib/tabela-referencia";

function ordenado(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenado);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.keys(valor as object)
        .filter((k) => (valor as Record<string, unknown>)[k] !== undefined)
        .sort()
        .map((k) => [k, ordenado((valor as Record<string, unknown>)[k])]),
    );
  }
  return valor;
}

/** Igualdade estrutural, sem depender da ordem das chaves dos objetos. */
export function iguais(a: unknown, b: unknown): boolean {
  return JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b));
}

/** Valor atômico: o meu se eu mudei, senão o deles. */
export function mesclarValor<T>(base: T, minha: T, deles: T): T {
  return iguais(minha, base) ? deles : minha;
}

/** Eu mudei a ordem relativa dos itens que já existiam na base? */
function reordenou(baseIds: string[], minhaIds: string[]): boolean {
  const naMinha = new Set(minhaIds);
  const naBase = new Set(baseIds);
  const a = baseIds.filter((id) => naMinha.has(id));
  const b = minhaIds.filter((id) => naBase.has(id));
  return !iguais(a, b);
}

/**
 * Merge de lista de itens com identidade. Item que só eu tenho: fica se eu
 * criei ou mexi nele (eles apagaram, eu editei depois → vence a edição);
 * some se eles apagaram e eu não mexi. Item que só eles têm: fica se eles
 * criaram; some se eu apaguei. Ordem: a minha se eu reordenei, senão a deles;
 * os itens que faltam entram logo depois do vizinho anterior na outra lista.
 */
export function mesclarLista<T>(
  base: T[],
  minha: T[],
  deles: T[],
  chave: (item: T) => string,
  mesclarItem: (base: T, minha: T, deles: T) => T,
): T[] {
  const porChave = (lista: T[]) => new Map(lista.map((item) => [chave(item), item]));
  const B = porChave(base);
  const M = porChave(minha);
  const D = porChave(deles);

  const resultado = new Map<string, T>();
  for (const k of new Set([...M.keys(), ...D.keys()])) {
    const b = B.get(k);
    const m = M.get(k);
    const d = D.get(k);
    if (m !== undefined && d !== undefined) {
      resultado.set(k, b !== undefined ? mesclarItem(b, m, d) : m);
    } else if (m !== undefined) {
      if (b === undefined || !iguais(m, b)) resultado.set(k, m);
    } else if (d !== undefined && b === undefined) {
      resultado.set(k, d);
    }
  }

  const ids = (lista: T[]) => lista.map(chave);
  const [principal, secundaria] = reordenou(ids(base), ids(minha))
    ? [ids(minha), ids(deles)]
    : [ids(deles), ids(minha)];

  const ordem = principal.filter((k) => resultado.has(k));
  secundaria.forEach((k, i) => {
    if (!resultado.has(k) || ordem.includes(k)) return;
    let pos = 0;
    for (let j = i - 1; j >= 0; j--) {
      const anterior = ordem.indexOf(secundaria[j]);
      if (anterior >= 0) {
        pos = anterior + 1;
        break;
      }
    }
    ordem.splice(pos, 0, k);
  });

  return ordem.map((k) => resultado.get(k)!);
}

/** Merge campo a campo; os grupos listados são tratados como um valor só. */
function mesclarObjeto<T extends object>(
  base: T,
  minha: T,
  deles: T,
  especiais: Partial<{ [K in keyof T]: (b: T[K], m: T[K], d: T[K]) => T[K] }> = {},
  grupos: (keyof T)[][] = [],
): T {
  const resultado = { ...deles };
  const agrupadas = new Set(grupos.flat());
  for (const grupo of grupos) {
    const pegar = (o: T) => grupo.map((k) => o[k]);
    const origem = iguais(pegar(minha), pegar(base)) ? deles : minha;
    for (const k of grupo) resultado[k] = origem[k];
  }
  const chaves = new Set([...Object.keys(minha), ...Object.keys(deles)]) as Set<keyof T>;
  for (const k of chaves) {
    if (agrupadas.has(k)) continue;
    const especial = especiais[k];
    resultado[k] = especial
      ? especial(base[k], minha[k], deles[k])
      : mesclarValor(base[k], minha[k], deles[k]);
  }
  return resultado;
}

const GRUPO_OPCOES: (keyof ColunaDraft)[] = [
  "opcoes",
  "multiplaSelecao",
  "opcoesCondicionais",
  "coresOpcoes",
  "usaPontuacao",
  "pontuacoes",
];

function chaveItem(item: { id?: string }): string {
  // O form sempre dá id (do banco ou `novoIdLocal`); sem id, o item não tem
  // identidade e é tratado como único.
  return item.id ?? `sem-id:${JSON.stringify(ordenado(item))}`;
}

function mesclarColuna(b: ColunaDraft, m: ColunaDraft, d: ColunaDraft): ColunaDraft {
  return mesclarObjeto(b, m, d, {}, [GRUPO_OPCOES]);
}

function mesclarCampo(b: CampoDraft, m: CampoDraft, d: CampoDraft): CampoDraft {
  return mesclarObjeto(b, m, d, {
    colunas: (bc, mc, dc) => mesclarLista(bc, mc, dc, chaveItem, mesclarColuna),
  });
}

function mesclarSecao(b: SecaoDraft, m: SecaoDraft, d: SecaoDraft): SecaoDraft {
  return mesclarObjeto(b, m, d, {
    campos: (bc, mc, dc) => mesclarLista(bc, mc, dc, chaveItem, mesclarCampo),
  });
}

export function mesclarSecoes(base: SecaoDraft[], minha: SecaoDraft[], deles: SecaoDraft[]) {
  return mesclarLista(base, minha, deles, chaveItem, mesclarSecao);
}

/** Célula/nome que pode faltar de um lado (linha ou coluna criada só por um). */
function mesclarTexto(b: string | undefined, m: string | undefined, d: string | undefined) {
  return mesclarValor(b, m, d) ?? m ?? d ?? "";
}

/**
 * Tabela de referência célula a célula: o form manda a tabela inteira, mas só
 * conta como alteração minha o que tem valor diferente da base (nome, cada
 * chave/resultado, cada limite de faixa, cada valor). Linhas casam pela
 * posição; quem mudou o número de linhas define quantas ficam. Se os dois
 * mudaram o número de chaves ou de resultados (colunas não casam mais pela
 * posição), vale a tabela inteira de quem salva por último.
 */
export function mesclarTabela(
  b: TabelaReferencia,
  m: TabelaReferencia,
  d: TabelaReferencia,
): TabelaReferencia {
  const mesmaForma = (x: TabelaReferencia) =>
    x.chaves.length === b.chaves.length && x.saidas.length === b.saidas.length;
  if (!mesmaForma(m) && !mesmaForma(d)) return mesclarValor(b, m, d);
  // Só um lado mudou as colunas (ou nenhum): a forma é a dele.
  const forma = mesmaForma(m) ? d : m;
  const indices = (n: number) => Array.from({ length: n }, (_, i) => i);

  const totalLinhas = m.linhas.length !== b.linhas.length ? m.linhas.length : d.linhas.length;
  return {
    ...mesclarObjeto(b, m, d, {}, []),
    nome: mesclarTexto(b.nome, m.nome, d.nome),
    chaves: indices(forma.chaves.length).map((i) => mesclarTexto(b.chaves[i], m.chaves[i], d.chaves[i])),
    saidas: indices(forma.saidas.length).map((i) => mesclarTexto(b.saidas[i], m.saidas[i], d.saidas[i])),
    linhas: indices(totalLinhas).map((l) => {
      const [bl, ml, dl] = [b.linhas[l], m.linhas[l], d.linhas[l]];
      return {
        faixas: indices(forma.chaves.length).map((i) => ({
          min: mesclarTexto(bl?.faixas[i]?.min, ml?.faixas[i]?.min, dl?.faixas[i]?.min),
          max: mesclarTexto(bl?.faixas[i]?.max, ml?.faixas[i]?.max, dl?.faixas[i]?.max),
        })),
        valores: indices(forma.saidas.length).map((i) =>
          mesclarTexto(bl?.valores[i], ml?.valores[i], dl?.valores[i]),
        ),
      };
    }),
  };
}

export function mesclarTabelas(
  base: TabelaReferencia[],
  minha: TabelaReferencia[],
  deles: TabelaReferencia[],
) {
  return mesclarLista(base, minha, deles, idTabela, mesclarTabela);
}

export function mesclarExame(base: ExameDraft, minha: ExameDraft, deles: ExameDraft): ExameDraft {
  return {
    nome: mesclarValor(base.nome, minha.nome, deles.nome),
    descricao: mesclarValor(base.descricao, minha.descricao, deles.descricao),
    tipo: mesclarValor(base.tipo, minha.tipo, deles.tipo),
    sombra: mesclarValor(base.sombra, minha.sombra, deles.sombra),
    variaveis: mesclarValor(base.variaveis, minha.variaveis, deles.variaveis),
    tabelas: mesclarTabelas(base.tabelas, minha.tabelas, deles.tabelas),
    secoes: mesclarSecoes(base.secoes, minha.secoes, deles.secoes),
  };
}

/**
 * Troca os ids de seção/campo/coluna segundo `mapa` (id antigo → id na versão
 * nova do exame), para um rascunho feito sobre a versão anterior continuar
 * casando com a atual. Ids fora do mapa ficam como estão.
 */
export function remapearSecoes(secoes: SecaoDraft[], mapa: Record<string, string>): SecaoDraft[] {
  if (Object.keys(mapa).length === 0) return secoes;
  const novo = (id?: string) => (id && mapa[id]) || id;
  return secoes.map((secao) => ({
    ...secao,
    id: novo(secao.id),
    campos: secao.campos.map((campo) => ({
      ...campo,
      id: novo(campo.id),
      colunas: campo.colunas.map((coluna) => ({ ...coluna, id: novo(coluna.id) })),
    })),
  }));
}

/**
 * Compõe mapas de versões em sequência (v1→v2, depois v2→v3) num só (v1→v3,
 * mantendo v2→v3 para quem já estava na v2).
 */
export function comporMapas(
  primeiro: Record<string, string>,
  segundo: Record<string, string>,
): Record<string, string> {
  const resultado: Record<string, string> = { ...segundo };
  for (const [antigo, intermediario] of Object.entries(primeiro)) {
    resultado[antigo] = segundo[intermediario] ?? intermediario;
  }
  return resultado;
}

type ItemComOrigem = { id: string; origemId: string | null };

/** Mapa id antigo → id novo a partir do `origemId` dos itens de uma versão. */
export function mapaDeOrigem(
  secoes: (ItemComOrigem & { campos: (ItemComOrigem & { colunas: ItemComOrigem[] })[] })[],
): Record<string, string> {
  const mapa: Record<string, string> = {};
  const registrar = (item: ItemComOrigem) => {
    if (item.origemId) mapa[item.origemId] = item.id;
  };
  for (const secao of secoes) {
    registrar(secao);
    for (const campo of secao.campos) {
      registrar(campo);
      campo.colunas.forEach(registrar);
    }
  }
  return mapa;
}
