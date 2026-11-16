import { describe, expect, it } from "vitest";
import {
  VISTA_INICIAL,
  ZOOM_MAX,
  ancorar,
  encaixar,
  limitarVista,
  paraLocal,
  zoomEm,
} from "./visor-zoom";

describe("encaixar", () => {
  it("encaixa imagem retrato centralizada no palco", () => {
    // palco 1000x600, margem 0, imagem 300x600 → altura limita, escala 1
    expect(encaixar(300, 600, 1000, 600, 0)).toEqual({
      left: 350,
      top: 0,
      w: 300,
      h: 600,
      palcoW: 1000,
      palcoH: 600,
    });
  });

  it("respeita margem e devolve null sem espaço", () => {
    const q = encaixar(1000, 1000, 416, 916, 8)!;
    expect(q.w).toBe(400);
    expect(q.left).toBe(8);
    expect(q.top).toBe(258);
    expect(encaixar(100, 100, 10, 10, 8)).toBeNull();
    expect(encaixar(0, 100, 500, 500)).toBeNull();
  });
});

describe("zoom", () => {
  const q = encaixar(400, 400, 400, 400, 0)!; // quadro ocupa o palco todo

  it("zoom 1 sempre centraliza", () => {
    expect(limitarVista({ z: 1, tx: 50, ty: -20 }, q)).toEqual(VISTA_INICIAL);
    expect(limitarVista({ z: 0.3, tx: 0, ty: 0 }, q)).toEqual(VISTA_INICIAL);
  });

  it("limita o zoom máximo", () => {
    expect(limitarVista({ z: 50, tx: 0, ty: 0 }, q).z).toBe(ZOOM_MAX);
  });

  it("mantém o ponto sob o cursor ao dar zoom", () => {
    const v = zoomEm(VISTA_INICIAL, 2, 100, 300, q);
    expect(v.z).toBe(2);
    // o ponto local (100, 300) continua em (100, 300) no palco
    const l = paraLocal(v, 100, 300, q);
    expect(l.x).toBeCloseTo(100);
    expect(l.y).toBeCloseTo(300);
  });

  it("não deixa a imagem sair do palco ao arrastar", () => {
    const v = limitarVista({ z: 2, tx: 5000, ty: -5000 }, q);
    // borda esquerda da imagem no máximo no centro do palco (200)
    expect(v.tx).toBe(200);
    // borda inferior (ty + 800) no mínimo no centro do palco
    expect(v.ty).toBe(200 - 800);
  });

  it("pinça: ancora o ponto entre os dedos", () => {
    const local = { x: 200, y: 200 };
    const v = ancorar(local, 3, 250, 180, q);
    const l = paraLocal(v, 250, 180, q);
    expect(l.x).toBeCloseTo(200);
    expect(l.y).toBeCloseTo(200);
  });
});
