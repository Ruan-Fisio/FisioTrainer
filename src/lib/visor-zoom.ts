/**
 * Zoom e navegação (pan) de uma imagem dentro de um "palco" de tamanho fixo.
 * A imagem é encaixada no palco (zoom 1) e depois transformada por
 * `translate(tx, ty) scale(z)` com origem no canto superior esquerdo do quadro.
 */

export type Vista = { z: number; tx: number; ty: number };

/** Posição/tamanho da imagem encaixada (zoom 1) e tamanho do palco, em px de tela. */
export type Quadro = {
  left: number;
  top: number;
  w: number;
  h: number;
  palcoW: number;
  palcoH: number;
};

export const VISTA_INICIAL: Vista = { z: 1, tx: 0, ty: 0 };
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 8;

const limitar = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Encaixa uma imagem `largura`×`altura` centralizada no palco, com margem. */
export function encaixar(
  largura: number,
  altura: number,
  palcoW: number,
  palcoH: number,
  margem = 8,
): Quadro | null {
  const dispW = palcoW - margem * 2;
  const dispH = palcoH - margem * 2;
  if (largura <= 0 || altura <= 0 || dispW <= 0 || dispH <= 0) return null;
  const escala = Math.min(dispW / largura, dispH / altura);
  const w = largura * escala;
  const h = altura * escala;
  return { left: (palcoW - w) / 2, top: (palcoH - h) / 2, w, h, palcoW, palcoH };
}

/**
 * Limita o zoom e impede que a imagem "fuja" do palco: o centro do palco
 * sempre fica sobre a imagem. No zoom 1 a imagem volta a ficar centralizada.
 */
export function limitarVista(v: Vista, q: Quadro): Vista {
  const z = limitar(v.z, ZOOM_MIN, ZOOM_MAX);
  if (z === ZOOM_MIN) return VISTA_INICIAL;
  const cx = q.palcoW / 2;
  const cy = q.palcoH / 2;
  return {
    z,
    tx: limitar(v.tx, cx - q.left - q.w * z, cx - q.left),
    ty: limitar(v.ty, cy - q.top - q.h * z, cy - q.top),
  };
}

/** Ponto do palco (sx, sy) convertido para coordenadas do quadro sem zoom. */
export function paraLocal(v: Vista, sx: number, sy: number, q: Quadro) {
  return { x: (sx - q.left - v.tx) / v.z, y: (sy - q.top - v.ty) / v.z };
}

/** Aplica o zoom `z` mantendo o ponto `local` do quadro sob (sx, sy) do palco. */
export function ancorar(
  local: { x: number; y: number },
  z: number,
  sx: number,
  sy: number,
  q: Quadro,
): Vista {
  const zz = limitar(z, ZOOM_MIN, ZOOM_MAX);
  return limitarVista(
    { z: zz, tx: sx - q.left - local.x * zz, ty: sy - q.top - local.y * zz },
    q,
  );
}

/** Zoom centrado em um ponto do palco (roda do mouse, botões, pinça). */
export function zoomEm(v: Vista, z: number, sx: number, sy: number, q: Quadro): Vista {
  return ancorar(paraLocal(v, sx, sy, q), z, sx, sy, q);
}
