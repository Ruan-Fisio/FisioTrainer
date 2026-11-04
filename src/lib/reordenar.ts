// Reordenação de listas por arrastar e soltar (lógica pura, sem React).

/** Nova lista com o item de `origem` na posição `destino`; índice inválido não muda nada. */
export function moverItem<T>(lista: T[], origem: number, destino: number): T[] {
  if (
    origem === destino ||
    origem < 0 ||
    destino < 0 ||
    origem >= lista.length ||
    destino >= lista.length
  ) {
    return lista;
  }
  const copia = [...lista];
  const [item] = copia.splice(origem, 1);
  copia.splice(destino, 0, item);
  return copia;
}

/** Onde foi parar o item que estava em `indice` depois de `moverItem(lista, origem, destino)`. */
export function indiceAposMover(indice: number, origem: number, destino: number): number {
  if (indice === origem) return destino;
  if (origem < indice && indice <= destino) return indice - 1;
  if (destino <= indice && indice < origem) return indice + 1;
  return indice;
}

/** Acompanha a reordenação em um conjunto de índices (ex. seções retraídas). */
export function remapearIndicesAposMover(
  indices: Set<number>,
  origem: number,
  destino: number,
): Set<number> {
  return new Set(Array.from(indices, (i) => indiceAposMover(i, origem, destino)));
}

/**
 * Chave de renderização estável de um item cujo id muda ao ser gravado (id
 * local → id do banco, ou id de uma versão → id da próxima). Mantém a chave
 * original para o React não remontar o item — o que tiraria o foco de quem está
 * digitando nele e interromperia um arraste em andamento.
 */
export function registrarChavesEstaveis(
  chaves: Record<string, string>,
  mapaIds: Record<string, string>,
): Record<string, string> {
  const novas = { ...chaves };
  for (const [antigo, novo] of Object.entries(mapaIds)) {
    novas[novo] = chaves[antigo] ?? antigo;
  }
  return novas;
}
