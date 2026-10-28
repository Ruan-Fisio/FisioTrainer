// Resumo legível do que mudou entre duas versões do rascunho do exame — o
// indicador da edição em tempo real mostra o que chegou de outra pessoa
// ("Diogo alterou: Tabela Flexões, Seção ANTROPOMETRIA").

import type { ExameDraft } from "@/lib/exame-draft";
import { iguais } from "@/lib/exame-merge";
import { idTabela } from "@/lib/tabela-referencia";

function porId<T>(lista: T[], chave: (item: T) => string | undefined) {
  const mapa = new Map<string, T>();
  lista.forEach((item, i) => mapa.set(chave(item) ?? `#${i}`, item));
  return mapa;
}

/** Mudanças de uma lista de itens nomeados: "X (nova)", "X (removida)", "X". */
function mudancasLista<T>(
  antes: T[],
  depois: T[],
  chave: (item: T) => string | undefined,
  rotulo: (item: T) => string,
  genero: "a" | "o",
): string[] {
  const A = porId(antes, chave);
  const D = porId(depois, chave);
  const itens: string[] = [];
  for (const [k, item] of D) {
    const anterior = A.get(k);
    if (!anterior) itens.push(`${rotulo(item)} (nov${genero})`);
    else if (!iguais(anterior, item)) itens.push(rotulo(item));
  }
  for (const [k, item] of A) {
    if (!D.has(k)) itens.push(`${rotulo(item)} (removid${genero})`);
  }
  const ordemAntes = [...A.keys()].filter((k) => D.has(k));
  const ordemDepois = [...D.keys()].filter((k) => A.has(k));
  if (itens.length === 0 && !iguais(ordemAntes, ordemDepois)) itens.push("ordem");
  return itens;
}

/**
 * O que mudou de `antes` para `depois`, em itens curtos para exibir. Seções e
 * tabelas casam por id (as seções de `antes` já remapeadas, se o exame virou
 * versão nova); vazio = nada mudou.
 */
export function resumirMudancas(antes: ExameDraft, depois: ExameDraft): string[] {
  const itens: string[] = [];
  if (antes.nome !== depois.nome) itens.push("Nome do exame");
  if (antes.descricao !== depois.descricao) itens.push("Descrição");
  if (antes.tipo !== depois.tipo) itens.push("Tipo do exame");
  if (antes.sombra !== depois.sombra) itens.push("Exame sombra");
  if (!iguais(antes.variaveis, depois.variaveis)) itens.push("Variáveis");

  const tabelas = mudancasLista(
    antes.tabelas,
    depois.tabelas,
    idTabela,
    (t) => `Tabela ${t.nome || "sem nome"}`,
    "a",
  );
  itens.push(...tabelas.map((t) => (t === "ordem" ? "Ordem das tabelas" : t)));

  const secoes = mudancasLista(
    antes.secoes,
    depois.secoes,
    (s) => s.id,
    (s) => `Seção ${s.nome || "sem nome"}`,
    "a",
  );
  itens.push(...secoes.map((s) => (s === "ordem" ? "Ordem das seções" : s)));
  return itens;
}

/** "A, B e mais 3" — para caber no indicador. */
export function listarResumido(itens: string[], maximo = 3): string {
  if (itens.length <= maximo) return itens.join(", ");
  return `${itens.slice(0, maximo).join(", ")} e mais ${itens.length - maximo}`;
}
