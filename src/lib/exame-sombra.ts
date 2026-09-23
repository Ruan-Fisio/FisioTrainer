export type ValorHistorico = { colunaId: string; valor: string; linha: number };
export type ColunaInfo = { id: string };

/**
 * Filtra os valores da execução anterior (Exame Sombra) para as colunas que
 * ainda existem no exame atual. O `valor` de cada coluna já vem serializado
 * pronto pra qualquer tipo (múltipla escolha, goniometria com grau, etc.) —
 * essa função não reinterpreta o conteúdo, só decide quais entradas ainda se
 * aplicam.
 */
export function montarValoresSombra(
  valoresExecucaoAnterior: ValorHistorico[],
  colunasAtuais: ColunaInfo[],
): ValorHistorico[] {
  const colunaIdsAtuais = new Set(colunasAtuais.map((c) => c.id));
  return valoresExecucaoAnterior.filter((v) => colunaIdsAtuais.has(v.colunaId));
}

/**
 * Um valor "vazio" pode vir de formas diferentes conforme o tipo de coluna:
 * string vazia (a maioria) ou "[]" (Goniometria sem nenhum movimento
 * selecionado, serializada como array JSON vazio). Usado pra decidir se um
 * campo "teve valor anterior de verdade" — tanto pro indicador "Valor
 * anterior" quanto pro botão "Ocultar campos sem valor anterior" — nunca
 * tratar um campo vazio como se tivesse sido preenchido antes.
 */
export function valorPreenchido(valor: string): boolean {
  return valor !== "" && valor !== "[]";
}
