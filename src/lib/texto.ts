/** Conta palavras separadas por qualquer espaço em branco (incluindo quebras de linha). */
export function contarPalavras(texto: string): number {
  const t = texto.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}
