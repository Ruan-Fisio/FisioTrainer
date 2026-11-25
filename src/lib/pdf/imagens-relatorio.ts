import { lerAnotacoes, type Anotacoes } from "@/lib/anotacoes-imagem";
import { getObjectBytes } from "@/lib/r2";
import {
  organizarAnexosRelatorio,
  type AnexoParaRelatorio,
} from "@/lib/relatorio-imagens";

/** Lado maior da imagem no PDF: suficiente para impressão sem inflar o arquivo. */
const LADO_MAXIMO_PX = 1600;

export type ImagemRelatorio = {
  legenda: string;
  nomeOriginal: string;
  /** JPEG já com a rotação EXIF aplicada (mesmo referencial do editor). */
  data: Buffer;
  largura: number;
  altura: number;
  anotacoes: Anotacoes | null;
};

export type AnexosRelatorio = {
  imagens: ImagemRelatorio[];
  /** Arquivos que não são imagem ou que não puderam ser lidos: só o nome. */
  outros: { legenda: string; nomeOriginal: string; falhou: boolean }[];
};

type AnexoBanco = AnexoParaRelatorio & { chave: string; anotacoes: unknown };

async function prepararImagem(bytes: Uint8Array) {
  const { default: sharp } = await import("sharp");
  const { data, info } = await sharp(Buffer.from(bytes))
    .rotate()
    .resize({
      width: LADO_MAXIMO_PX,
      height: LADO_MAXIMO_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { data, largura: info.width, altura: info.height };
}

/**
 * Baixa do storage as imagens da execução para o fim do PDF, na ordem do
 * exame. Falha numa imagem (formato que o sharp não lê, objeto sumido) não
 * derruba o relatório: ela vira item da lista "outros" marcado como falha.
 */
export async function carregarAnexosRelatorio(
  exame: Parameters<typeof organizarAnexosRelatorio>[0],
  anexos: AnexoBanco[],
): Promise<AnexosRelatorio> {
  const { imagens, outros } = organizarAnexosRelatorio(exame, anexos);

  const resultados = await Promise.all(
    imagens.map(async (imagem) => {
      try {
        const bytes = await getObjectBytes(imagem.chave);
        const preparada = await prepararImagem(bytes);
        return {
          ok: true as const,
          imagem: {
            legenda: imagem.legenda,
            nomeOriginal: imagem.nomeOriginal,
            ...preparada,
            anotacoes: lerAnotacoes(imagem.anotacoes),
          },
        };
      } catch (e) {
        console.error(`Falha ao incluir imagem no relatório: ${imagem.chave}`, e);
        return { ok: false as const, imagem };
      }
    }),
  );

  return {
    imagens: resultados.flatMap((r) => (r.ok ? [r.imagem] : [])),
    outros: [
      ...resultados.flatMap((r) =>
        r.ok
          ? []
          : [{ legenda: r.imagem.legenda, nomeOriginal: r.imagem.nomeOriginal, falhou: true }],
      ),
      ...outros.map((o) => ({ legenda: o.legenda, nomeOriginal: o.nomeOriginal, falhou: false })),
    ],
  };
}
