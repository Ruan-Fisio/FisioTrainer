import { describe, expect, it } from "vitest";
import {
  alinharReto,
  anguloGraus,
  pontoAncora,
  anotacoesVazias,
  cmPorPixel,
  distanciaPx,
  formatarDistancia,
  inclinacaoGraus,
  lerAnotacoes,
  limitarPonto,
  moverPonto,
  pontosDaForma,
  transladar,
  type Forma,
} from "./anotacoes-imagem";

describe("distanciaPx", () => {
  it("usa as dimensões reais (imagem não quadrada)", () => {
    // 0,5 da largura de 1000 = 500px; 0,5 da altura de 200 = 100px
    expect(distanciaPx({ x: 0, y: 0 }, { x: 0.5, y: 0 }, 1000, 200)).toBe(500);
    expect(distanciaPx({ x: 0, y: 0 }, { x: 0, y: 0.5 }, 1000, 200)).toBe(100);
  });
});

describe("calibração e formatação", () => {
  const anot = {
    ...anotacoesVazias(1000, 1000),
    calibracao: { a: { x: 0, y: 0 }, b: { x: 0.5, y: 0 }, cm: 10 },
  };

  it("converte pixels em cm pela régua calibrada", () => {
    expect(cmPorPixel(anot.calibracao, 1000, 1000)).toBeCloseTo(10 / 500);
    // régua de 500px = 10cm → 250px = 5cm
    expect(
      formatarDistancia({ x: 0, y: 0 }, { x: 0.25, y: 0 }, anot),
    ).toBe("5,0 cm");
  });

  it("sem calibração mostra pixels", () => {
    expect(
      formatarDistancia({ x: 0, y: 0 }, { x: 0.1, y: 0 }, anotacoesVazias(1000, 500)),
    ).toBe("100 px");
  });

  it("calibração com pontos coincidentes é ignorada", () => {
    const p = { x: 0.3, y: 0.3 };
    expect(cmPorPixel({ a: p, b: p, cm: 5 }, 100, 100)).toBeNull();
  });
});

describe("anguloGraus", () => {
  it("90° em ângulo reto", () => {
    expect(
      anguloGraus({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, 100, 100),
    ).toBeCloseTo(90);
  });

  it("180° em pontos alinhados e 0° sobrepostos", () => {
    expect(
      anguloGraus({ x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.5 }, 100, 100),
    ).toBeCloseTo(180);
    expect(
      anguloGraus({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, 100, 100),
    ).toBeCloseTo(0);
  });

  it("respeita a proporção da imagem", () => {
    // largura 200, altura 100: (0,5;0) e (0;0,5) → vetores 100px e 50px → 90°
    expect(
      anguloGraus({ x: 0.5, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0.5 }, 200, 100),
    ).toBeCloseTo(90);
    // diagonal de um retângulo 200x100 não é 45°
    expect(
      anguloGraus({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }, 200, 100),
    ).toBeCloseTo(26.565, 2);
  });

  it("vértice coincidente com um ponto devolve 0", () => {
    const p = { x: 0.2, y: 0.2 };
    expect(anguloGraus(p, p, { x: 0.8, y: 0.8 }, 100, 100)).toBe(0);
  });
});

describe("inclinacaoGraus", () => {
  it("0° na horizontal e 90° na vertical, em qualquer sentido", () => {
    expect(inclinacaoGraus({ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, 100, 100)).toBe(0);
    expect(inclinacaoGraus({ x: 0.8, y: 0.5 }, { x: 0.2, y: 0.5 }, 100, 100)).toBe(0);
    expect(inclinacaoGraus({ x: 0.5, y: 0.9 }, { x: 0.5, y: 0.1 }, 100, 100)).toBeCloseTo(90);
  });

  it("45° na diagonal, subindo ou descendo", () => {
    expect(inclinacaoGraus({ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, 100, 100)).toBeCloseTo(45);
    expect(inclinacaoGraus({ x: 0.5, y: 0.5 }, { x: 0, y: 1 }, 100, 100)).toBeCloseTo(45);
  });

  it("respeita a proporção da imagem", () => {
    // largura 200, altura 100: diagonal do retângulo = atan(100/200)
    expect(inclinacaoGraus({ x: 0, y: 0 }, { x: 1, y: 1 }, 200, 100)).toBeCloseTo(26.565, 2);
  });

  it("pontos coincidentes devolvem 0", () => {
    const p = { x: 0.3, y: 0.3 };
    expect(inclinacaoGraus(p, p, 100, 100)).toBe(0);
  });

  it("forma inclinacao é válida, tem 2 alças e âncora na outra ponta", () => {
    const f: Forma = {
      id: "i",
      cor: "#ef4444",
      tipo: "inclinacao",
      a: { x: 0.1, y: 0.1 },
      b: { x: 0.5, y: 0.3 },
    };
    expect(lerAnotacoes({ ...anotacoesVazias(10, 10), formas: [f] })).not.toBeNull();
    expect(pontosDaForma(f)).toEqual([f.a, f.b]);
    expect(pontoAncora(f, 1)).toEqual(f.a);
    expect(moverPonto(f, 1, { x: 0.9, y: 0.9 })).toMatchObject({ b: { x: 0.9, y: 0.9 } });
  });
});

describe("lerAnotacoes", () => {
  it("aceita documento válido e rejeita lixo", () => {
    const ok = {
      ...anotacoesVazias(800, 600),
      formas: [
        { id: "a", cor: "#ef4444", tipo: "linha", a: { x: 0, y: 0 }, b: { x: 1, y: 1 } },
      ],
    };
    expect(lerAnotacoes(ok)).toEqual(ok);
    expect(lerAnotacoes(null)).toBeNull();
    expect(lerAnotacoes({ versao: 2 })).toBeNull();
  });

  it("rejeita ponto fora do quadro, cor inválida e texto vazio", () => {
    const forma = { id: "a", cor: "#ef4444", tipo: "linha", a: { x: 0, y: 0 }, b: { x: 1, y: 1 } };
    const doc = (f: unknown) => ({ ...anotacoesVazias(10, 10), formas: [f] });
    expect(lerAnotacoes(doc({ ...forma, b: { x: 1.2, y: 0 } }))).toBeNull();
    expect(lerAnotacoes(doc({ ...forma, cor: "red" }))).toBeNull();
    expect(
      lerAnotacoes(
        doc({ id: "t", cor: "#000000", tipo: "texto", pos: { x: 0, y: 0 }, texto: "  " }),
      ),
    ).toBeNull();
  });

  it("limita a quantidade de formas", () => {
    const forma = { id: "a", cor: "#ef4444", tipo: "linha", a: { x: 0, y: 0 }, b: { x: 1, y: 1 } };
    expect(
      lerAnotacoes({ ...anotacoesVazias(10, 10), formas: Array(201).fill(forma) }),
    ).toBeNull();
  });
});

describe("limitarPonto", () => {
  it("mantém o ponto dentro da imagem", () => {
    expect(limitarPonto({ x: -0.2, y: 1.4 })).toEqual({ x: 0, y: 1 });
  });
});

describe("mover formas", () => {
  const linha: Forma = {
    id: "l",
    cor: "#ef4444",
    tipo: "linha",
    a: { x: 0.2, y: 0.2 },
    b: { x: 0.4, y: 0.3 },
  };

  it("move só a alça escolhida", () => {
    const r = moverPonto(linha, 1, { x: 0.9, y: 0.2 });
    expect(r).toMatchObject({ a: { x: 0.2, y: 0.2 }, b: { x: 0.9, y: 0.2 } });
  });

  it("limita a alça ao quadro e ignora índice inválido", () => {
    expect(moverPonto(linha, 0, { x: -1, y: 2 })).toMatchObject({ a: { x: 0, y: 1 } });
    expect(moverPonto(linha, 5, { x: 0.5, y: 0.5 })).toBe(linha);
  });

  it("move o vértice de um ângulo", () => {
    const ang: Forma = {
      id: "a",
      cor: "#ef4444",
      tipo: "angulo",
      a: { x: 0.1, y: 0.1 },
      vertice: { x: 0.5, y: 0.5 },
      b: { x: 0.9, y: 0.1 },
    };
    expect(pontosDaForma(ang)).toHaveLength(3);
    expect(moverPonto(ang, 1, { x: 0.6, y: 0.7 })).toMatchObject({
      vertice: { x: 0.6, y: 0.7 },
      a: { x: 0.1, y: 0.1 },
    });
  });

  it("translada preservando o formato", () => {
    const r = transladar(linha, 0.1, 0.2) as typeof linha;
    expect(r.a.x).toBeCloseTo(0.3);
    expect(r.b.y).toBeCloseTo(0.5);
    expect(r.b.x - r.a.x).toBeCloseTo(0.2);
  });

  it("na borda, para sem deformar a forma", () => {
    const r = transladar(linha, 5, -5) as typeof linha;
    expect(r.b.x).toBeCloseTo(1);
    expect(r.a.y).toBeCloseTo(0);
    expect(r.b.x - r.a.x).toBeCloseTo(0.2);
    expect(r.b.y - r.a.y).toBeCloseTo(0.1);
  });

  it("desenho livre só translada", () => {
    const livre: Forma = {
      id: "v",
      cor: "#000000",
      tipo: "livre",
      pontos: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.3 }],
    };
    expect(pontosDaForma(livre)).toEqual([]);
    expect(moverPonto(livre, 0, { x: 0.5, y: 0.5 })).toBe(livre);
    const r = transladar(livre, 0.1, 0) as typeof livre;
    expect(r.pontos[1].x).toBeCloseTo(0.3);
  });
});

describe("alinharReto", () => {
  const o = { x: 0.2, y: 0.2 };

  it("ímã: trava no eixo quando está perto", () => {
    // 200px à direita, 4px abaixo (~1°) → horizontal
    expect(alinharReto(o, { x: 0.4, y: 0.204 }, 1000, 1000)).toEqual({ x: 0.4, y: 0.2 });
    // quase vertical
    expect(alinharReto(o, { x: 0.205, y: 0.6 }, 1000, 1000)).toEqual({ x: 0.2, y: 0.6 });
  });

  it("ímã: deixa diagonais livres", () => {
    const p = { x: 0.5, y: 0.5 };
    expect(alinharReto(o, p, 1000, 1000)).toBe(p);
  });

  it("forçado: sempre trava no eixo mais próximo", () => {
    expect(alinharReto(o, { x: 0.5, y: 0.4 }, 1000, 1000, true)).toEqual({ x: 0.5, y: 0.2 });
    expect(alinharReto(o, { x: 0.3, y: 0.7 }, 1000, 1000, true)).toEqual({ x: 0.2, y: 0.7 });
  });

  it("mede o ângulo em pixels (imagem larga)", () => {
    // largura 2000, altura 500: dx=0.1*2000=200px, dy=0.1*500=50px (14°) → fora do ímã
    const p = { x: 0.3, y: 0.3 };
    expect(alinharReto(o, p, 2000, 500)).toBe(p);
    // forçado: horizontal
    expect(alinharReto(o, p, 2000, 500, true)).toEqual({ x: 0.3, y: 0.2 });
  });

  it("ponto idêntico à origem não muda", () => {
    expect(alinharReto(o, o, 100, 100, true)).toBe(o);
  });
});

describe("pontoAncora", () => {
  it("linha: a outra ponta; ângulo: o vértice", () => {
    const l: Forma = { id: "l", cor: "#ef4444", tipo: "linha", a: { x: 0.1, y: 0.1 }, b: { x: 0.9, y: 0.9 } };
    expect(pontoAncora(l, 0)).toEqual(l.tipo === "linha" ? l.b : null);
    expect(pontoAncora(l, 1)).toEqual({ x: 0.1, y: 0.1 });
    const a: Forma = { id: "a", cor: "#ef4444", tipo: "angulo", a: { x: 0, y: 0 }, vertice: { x: 0.5, y: 0.5 }, b: { x: 1, y: 0 } };
    expect(pontoAncora(a, 2)).toEqual({ x: 0.5, y: 0.5 });
    expect(pontoAncora(a, 1)).toBeNull();
  });
});
