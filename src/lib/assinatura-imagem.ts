/**
 * Tratamento da assinatura do profissional (ver docs/documentos.md). Funções puras sobre
 * pixels RGBA, usadas pelo client para transformar a foto de uma assinatura no papel em
 * PNG transparente, e leitura das dimensões do PNG para o server validar o que recebe.
 */

export const LARGURA_MAXIMA_ASSINATURA = 900;
export const ALTURA_MAXIMA_ASSINATURA = 300;
/** PNG final; o mesmo limite de `decodificarAssinaturaPng` (contrato-regras), que o server confere. */
export const TAMANHO_MAXIMO_PNG = 300 * 1024;
/** Foto enviada pelo usuário, antes do tratamento. */
export const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024;

/** Cor do traço no PNG final — a mesma do campo de desenho. */
const TINTA = [0x11, 0x18, 0x27] as const;
/** Pixel abaixo deste alfa é considerado vazio no recorte. */
const ALFA_MINIMO = 24;

export type ImagemRgba = { data: Uint8ClampedArray; largura: number; altura: number };

function luminancia(d: Uint8ClampedArray, i: number) {
  return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
}

/** Luminância média de uma faixa nas bordas da imagem (onde, numa foto de assinatura, há só papel). */
export function luminanciaDoFundo(img: ImagemRgba): number {
  const { data, largura, altura } = img;
  const faixa = Math.max(1, Math.round(Math.min(largura, altura) * 0.04));
  let soma = 0;
  let n = 0;
  for (let y = 0; y < altura; y++) {
    const naBordaY = y < faixa || y >= altura - faixa;
    for (let x = 0; x < largura; x++) {
      if (!naBordaY && x >= faixa && x < largura - faixa) continue;
      soma += luminancia(data, (y * largura + x) * 4);
      n++;
    }
  }
  return n ? soma / n : 255;
}

/**
 * O papel (claro) vira transparente e o traço vira tinta escura uniforme. O limiar sai da
 * luminância das bordas, então papel acinzentado ou com sombra leve também some. A
 * transição é suave (alfa proporcional ao quanto o pixel é mais escuro que o limiar).
 */
export function limparFundo(img: ImagemRgba): ImagemRgba {
  const fundo = luminanciaDoFundo(img);
  const limiar = fundo * 0.78;
  const rampa = Math.max(1, limiar * 0.35);
  const saida = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    const lum = luminancia(img.data, i);
    const alfaOriginal = img.data[i + 3] / 255;
    const tinta = lum >= limiar ? 0 : Math.min(1, (limiar - lum) / rampa);
    saida[i] = TINTA[0];
    saida[i + 1] = TINTA[1];
    saida[i + 2] = TINTA[2];
    saida[i + 3] = Math.round(tinta * alfaOriginal * 255);
  }
  return { data: saida, largura: img.largura, altura: img.altura };
}

/** Recorta as bordas vazias (transparentes), com uma margem. Null se não sobrou traço. */
export function recortarBordas(img: ImagemRgba, margem = 8): ImagemRgba | null {
  const { data, largura, altura } = img;
  let x0 = largura;
  let y0 = altura;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (data[(y * largura + x) * 4 + 3] < ALFA_MINIMO) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - margem);
  y0 = Math.max(0, y0 - margem);
  x1 = Math.min(largura - 1, x1 + margem);
  y1 = Math.min(altura - 1, y1 + margem);
  const nl = x1 - x0 + 1;
  const na = y1 - y0 + 1;
  const saida = new Uint8ClampedArray(nl * na * 4);
  for (let y = 0; y < na; y++) {
    const inicio = ((y0 + y) * largura + x0) * 4;
    saida.set(data.subarray(inicio, inicio + nl * 4), y * nl * 4);
  }
  return { data: saida, largura: nl, altura: na };
}

/** Tamanho final: reduz proporcionalmente para caber em 900×300; nunca amplia. */
export function dimensoesSaida(largura: number, altura: number) {
  const escala = Math.min(1, LARGURA_MAXIMA_ASSINATURA / largura, ALTURA_MAXIMA_ASSINATURA / altura);
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };
}

/** Erro de um arquivo de foto antes de tentar abrir, ou null se pode seguir. */
export function erroArquivoFoto(arquivo: { type: string; size: number }): string | null {
  if (!arquivo.type.startsWith("image/")) return "Envie uma imagem (foto ou PNG/JPEG).";
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) return "A foto passa de 10 MB. Envie uma menor.";
  return null;
}

const CABECALHO_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Largura/altura de um PNG lidas do IHDR, ou null se não for PNG. */
export function dimensoesPng(bytes: Uint8Array): { largura: number; altura: number } | null {
  if (bytes.length < 24) return null;
  for (let i = 0; i < 8; i++) if (bytes[i] !== CABECALHO_PNG[i]) return null;
  const tipo = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (tipo !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { largura: view.getUint32(16), altura: view.getUint32(20) };
}

/** PNG dentro do limite de dimensões da assinatura. */
export function pngDentroDoLimite(bytes: Uint8Array): boolean {
  const d = dimensoesPng(bytes);
  return (
    !!d &&
    d.largura > 0 &&
    d.altura > 0 &&
    d.largura <= LARGURA_MAXIMA_ASSINATURA &&
    d.altura <= ALTURA_MAXIMA_ASSINATURA
  );
}
