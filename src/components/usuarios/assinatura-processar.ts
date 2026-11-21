import {
  dimensoesSaida,
  erroArquivoFoto,
  limparFundo,
  recortarBordas,
  TAMANHO_MAXIMO_PNG,
  type ImagemRgba,
} from "@/lib/assinatura-imagem";

/** Foto grande é reduzida antes do tratamento (pixel a pixel no navegador). */
const LADO_MAXIMO_TRATAMENTO = 1600;

export type ResultadoAssinatura = { ok: true; dataUrl: string } | { ok: false; erro: string };

function canvas(largura: number, altura: number) {
  const c = document.createElement("canvas");
  c.width = largura;
  c.height = altura;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");
  return { c, ctx };
}

/** Pixels de uma imagem já carregada, reduzida para no máximo 1600px no maior lado. */
function pixels(fonte: CanvasImageSource, largura: number, altura: number): ImagemRgba {
  const escala = Math.min(1, LADO_MAXIMO_TRATAMENTO / Math.max(largura, altura));
  const l = Math.max(1, Math.round(largura * escala));
  const a = Math.max(1, Math.round(altura * escala));
  const { ctx } = canvas(l, a);
  ctx.drawImage(fonte, 0, 0, l, a);
  return { data: ctx.getImageData(0, 0, l, a).data, largura: l, altura: a };
}

/** Recorta, reduz para ≤ 900×300 e exporta PNG transparente. */
function exportar(img: ImagemRgba | null, semTraco: string): ResultadoAssinatura {
  const recortada = img && recortarBordas(img);
  if (!recortada) return { ok: false, erro: semTraco };

  const origem = canvas(recortada.largura, recortada.altura);
  origem.ctx.putImageData(
    new ImageData(new Uint8ClampedArray(recortada.data), recortada.largura, recortada.altura),
    0,
    0,
  );
  const { largura, altura } = dimensoesSaida(recortada.largura, recortada.altura);
  const destino = canvas(largura, altura);
  destino.ctx.imageSmoothingQuality = "high";
  destino.ctx.drawImage(origem.c, 0, 0, largura, altura);
  const dataUrl = destino.c.toDataURL("image/png");
  // base64 ≈ 4/3 do binário
  if ((dataUrl.length * 3) / 4 > TAMANHO_MAXIMO_PNG) {
    return { ok: false, erro: "A assinatura ficou grande demais. Tente uma foto mais simples." };
  }
  return { ok: true, dataUrl };
}

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagem ilegível"));
    };
    img.src = url;
  });
}

/** Foto da assinatura no papel → PNG transparente e recortado. */
export async function processarFotoAssinatura(arquivo: File): Promise<ResultadoAssinatura> {
  const erro = erroArquivoFoto(arquivo);
  if (erro) return { ok: false, erro };
  let img: HTMLImageElement;
  try {
    img = await carregarImagem(arquivo);
  } catch {
    return {
      ok: false,
      erro: "Não foi possível abrir essa imagem. Envie em JPEG ou PNG (fotos HEIC do iPhone podem não abrir neste navegador).",
    };
  }
  const limpa = limparFundo(pixels(img, img.naturalWidth, img.naturalHeight));
  return exportar(
    limpa,
    "Não encontramos a assinatura na foto. Use papel branco, caneta escura e boa luz.",
  );
}

/** Assinatura desenhada no campo (já transparente) → recortada às bordas do traço. */
export async function processarDesenhoAssinatura(dataUrl: string): Promise<ResultadoAssinatura> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  return exportar(pixels(img, img.naturalWidth, img.naturalHeight), "Desenhe a assinatura.");
}
