import { ehImagem } from "@/lib/storage-keys";

type ExameParaLegenda = {
  secoes: {
    nome: string;
    campos: {
      nome: string;
      repetivel: boolean;
      colunas: { id: string; titulo: string }[];
    }[];
  }[];
};

export type AnexoParaRelatorio = {
  colunaId: string;
  linha: number;
  nomeOriginal: string;
  mime: string;
};

export type AnexoComLegenda<A extends AnexoParaRelatorio> = A & { legenda: string };

/**
 * Anexos da execução na ordem do exame (seção → campo → coluna → entrada),
 * com legenda "Seção — Campo — Coluna (entrada N)". Separa imagens (entram
 * desenhadas no PDF) dos demais arquivos (só listados pelo nome). Anexo de
 * coluna que não existe mais no exame vai para o fim, legendado pelo nome.
 */
export function organizarAnexosRelatorio<A extends AnexoParaRelatorio>(
  exame: ExameParaLegenda,
  anexos: A[],
): { imagens: AnexoComLegenda<A>[]; outros: AnexoComLegenda<A>[] } {
  const colunas = new Map<
    string,
    { ordem: number; rotulo: string; repetivel: boolean }
  >();
  let ordem = 0;
  for (const secao of exame.secoes) {
    for (const campo of secao.campos) {
      for (const coluna of campo.colunas) {
        const partes = [secao.nome, campo.nome, coluna.titulo].filter(
          (p) => p && p.trim() !== "",
        );
        colunas.set(coluna.id, {
          ordem: ordem++,
          rotulo: partes.join(" — "),
          repetivel: campo.repetivel,
        });
      }
    }
  }

  const ordenados = anexos
    .map((anexo, indice) => ({ anexo, indice, coluna: colunas.get(anexo.colunaId) }))
    .sort(
      (a, b) =>
        (a.coluna?.ordem ?? Infinity) - (b.coluna?.ordem ?? Infinity) ||
        a.anexo.linha - b.anexo.linha ||
        a.indice - b.indice,
    )
    .map(({ anexo, coluna }) => ({
      ...anexo,
      legenda: coluna
        ? `${coluna.rotulo}${coluna.repetivel ? ` (entrada ${anexo.linha + 1})` : ""}`
        : anexo.nomeOriginal,
    }));

  return {
    imagens: ordenados.filter((a) => ehImagem(a.mime)),
    outros: ordenados.filter((a) => !ehImagem(a.mime)),
  };
}

/** Tamanho em pontos que cabe na caixa mantendo a proporção. */
export function encaixarNaCaixa(
  largura: number,
  altura: number,
  maxLargura: number,
  maxAltura: number,
): { largura: number; altura: number } {
  if (largura <= 0 || altura <= 0) return { largura: maxLargura, altura: maxAltura };
  const escala = Math.min(maxLargura / largura, maxAltura / altura);
  return { largura: largura * escala, altura: altura * escala };
}
