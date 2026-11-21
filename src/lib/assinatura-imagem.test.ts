import { describe, expect, it } from "vitest";
import {
  dimensoesPng,
  dimensoesSaida,
  erroArquivoFoto,
  limparFundo,
  pngDentroDoLimite,
  recortarBordas,
  type ImagemRgba,
} from "@/lib/assinatura-imagem";
import { pngDeTeste } from "@/lib/png-teste";

/** Imagem com fundo cinza-claro e um traço escuro horizontal em [x0,x1]×[y0,y1]. */
function foto(largura: number, altura: number, fundo: number, traco?: [number, number, number, number]) {
  const data = new Uint8ClampedArray(largura * altura * 4);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4;
      const dentro = traco && x >= traco[0] && x <= traco[1] && y >= traco[2] && y <= traco[3];
      const v = dentro ? 30 : fundo;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, largura, altura } satisfies ImagemRgba;
}

function alfa(img: ImagemRgba, x: number, y: number) {
  return img.data[(y * img.largura + x) * 4 + 3];
}

describe("limparFundo", () => {
  it("papel branco ou acinzentado vira transparente e o traço fica opaco", () => {
    for (const fundo of [250, 200]) {
      const r = limparFundo(foto(100, 50, fundo, [20, 80, 20, 25]));
      expect(alfa(r, 2, 2)).toBe(0);
      expect(alfa(r, 50, 40)).toBe(0);
      expect(alfa(r, 50, 22)).toBe(255);
    }
  });

  it("o traço sai na cor de tinta escura", () => {
    const r = limparFundo(foto(40, 20, 240, [10, 30, 8, 10]));
    const i = (9 * 40 + 20) * 4;
    expect([r.data[i], r.data[i + 1], r.data[i + 2]]).toEqual([0x11, 0x18, 0x27]);
  });
});

describe("recortarBordas", () => {
  it("recorta ao traço com margem", () => {
    const r = recortarBordas(limparFundo(foto(200, 100, 245, [50, 149, 40, 49])), 5);
    expect(r).not.toBeNull();
    expect(r!.largura).toBe(100 + 10);
    expect(r!.altura).toBe(10 + 10);
    expect(alfa(r!, 5, 5)).toBe(255);
    expect(alfa(r!, 0, 0)).toBe(0);
  });

  it("a margem não passa das bordas da imagem", () => {
    const r = recortarBordas(limparFundo(foto(60, 30, 245, [0, 59, 10, 12])), 8)!;
    expect(r.largura).toBe(60);
  });

  it("imagem sem traço → null", () => {
    expect(recortarBordas(limparFundo(foto(80, 40, 230)))).toBeNull();
  });
});

describe("dimensoesSaida", () => {
  it("reduz proporcionalmente para caber em 900×300", () => {
    expect(dimensoesSaida(1800, 300)).toEqual({ largura: 900, altura: 150 });
    expect(dimensoesSaida(600, 600)).toEqual({ largura: 300, altura: 300 });
  });
  it("nunca amplia", () => {
    expect(dimensoesSaida(400, 100)).toEqual({ largura: 400, altura: 100 });
  });
});

describe("erroArquivoFoto", () => {
  it("recusa o que não é imagem e foto acima de 10 MB", () => {
    expect(erroArquivoFoto({ type: "application/pdf", size: 1000 })).toMatch(/imagem/);
    expect(erroArquivoFoto({ type: "image/jpeg", size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
    expect(erroArquivoFoto({ type: "image/heic", size: 2_000_000 })).toBeNull();
  });
});

describe("dimensoesPng / pngDentroDoLimite", () => {
  const png = (largura: number, altura: number) => new Uint8Array(pngDeTeste(largura, altura));

  it("lê largura e altura do IHDR", () => {
    expect(dimensoesPng(png(900, 300))).toEqual({ largura: 900, altura: 300 });
  });

  it("recusa bytes que não são PNG", () => {
    expect(dimensoesPng(new Uint8Array(40))).toBeNull();
    expect(pngDentroDoLimite(new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it("aceita até 900×300 e recusa acima", () => {
    expect(pngDentroDoLimite(png(900, 300))).toBe(true);
    expect(pngDentroDoLimite(png(901, 300))).toBe(false);
    expect(pngDentroDoLimite(png(900, 301))).toBe(false);
  });
});
