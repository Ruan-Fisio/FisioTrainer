import { describe, expect, it } from "vitest";
import { RunnableLambda } from "@langchain/core/runnables";
import type { VistaPostural } from "./analise-postural";
import sharp from "sharp";
import {
  criarPipelinePostural,
  etapasFake,
  prepararImagem,
  type EtapasPostural,
} from "./analise-postural-pipeline";

const IMAGEM = { base64: "AAAA", mime: "image/jpeg" };

/** Etapas fake que contam chamadas e cobram tokens fixos. */
function etapasContadas(vista: VistaPostural) {
  const chamadas = { classificar: 0, anterior: 0, posterior: 0, lateral: 0 };
  const etapas: EtapasPostural = {
    classificar: RunnableLambda.from(() => {
      chamadas.classificar++;
      return { dados: { vista, confianca: 0.9 }, uso: { entrada: 100, saida: 10 } };
    }),
    localizarAnterior: RunnableLambda.from((x) => {
      chamadas.anterior++;
      expect(x.vista).toBe("anterior");
      expect(x.base64).toBe(IMAGEM.base64);
      return { dados: { manubrio: { x: 1, y: 2 } }, uso: { entrada: 200, saida: 20 } };
    }),
    localizarPosterior: RunnableLambda.from((x) => {
      chamadas.posterior++;
      expect(x.vista).toBe("posterior");
      return { dados: { c7: { x: 5, y: 6 } }, uso: { entrada: 200, saida: 20 } };
    }),
    localizarLateral: RunnableLambda.from((x) => {
      chamadas.lateral++;
      expect(x.vista).toBe(vista);
      return { dados: { trago: { x: 3, y: 4 } }, uso: { entrada: 300, saida: 30 } };
    }),
  };
  return { etapas, chamadas };
}

describe("criarPipelinePostural", () => {
  it("não postural para na classificação", async () => {
    const { etapas, chamadas } = etapasContadas("nao_postural");
    const r = await criarPipelinePostural(etapas).invoke(IMAGEM);
    expect(r.resultado).toEqual({ vista: "nao_postural", confianca: 0.9 });
    expect(r.uso).toEqual({ entrada: 100, saida: 10 });
    expect(chamadas).toEqual({ classificar: 1, anterior: 0, posterior: 0, lateral: 0 });
  });

  it("anterior vai para a etapa anterior", async () => {
    const { etapas, chamadas } = etapasContadas("anterior");
    const r = await criarPipelinePostural(etapas).invoke(IMAGEM);
    expect(r.resultado).toEqual({ vista: "anterior", confianca: 0.9, pontos: { manubrio: { x: 1, y: 2 } } });
    expect(r.uso).toEqual({ entrada: 300, saida: 30 });
    expect(chamadas).toEqual({ classificar: 1, anterior: 1, posterior: 0, lateral: 0 });
  });

  it("posterior vai para a etapa posterior", async () => {
    const { etapas, chamadas } = etapasContadas("posterior");
    const r = await criarPipelinePostural(etapas).invoke(IMAGEM);
    expect(r.resultado).toEqual({ vista: "posterior", confianca: 0.9, pontos: { c7: { x: 5, y: 6 } } });
    expect(chamadas).toEqual({ classificar: 1, anterior: 0, posterior: 1, lateral: 0 });
  });

  it.each(["lateral_direita", "lateral_esquerda"] as const)(
    "%s vai para a etapa lateral",
    async (vista) => {
      const { etapas, chamadas } = etapasContadas(vista);
      const r = await criarPipelinePostural(etapas).invoke(IMAGEM);
      expect(r.resultado).toEqual({ vista, confianca: 0.9, pontos: { trago: { x: 3, y: 4 } } });
      expect(r.uso).toEqual({ entrada: 400, saida: 40 });
      expect(chamadas).toEqual({ classificar: 1, anterior: 0, posterior: 0, lateral: 1 });
    },
  );

  it("propaga erro de uma etapa", async () => {
    const { etapas } = etapasContadas("anterior");
    etapas.localizarAnterior = RunnableLambda.from(() => {
      throw new Error("timeout");
    });
    await expect(criarPipelinePostural(etapas).invoke(IMAGEM)).rejects.toThrow("timeout");
  });

  it("etapas fake produzem resultado completo", async () => {
    const r = await criarPipelinePostural(etapasFake("posterior")).invoke(IMAGEM);
    expect(r.resultado.vista).toBe("posterior");
    if (r.resultado.vista === "posterior") expect(r.resultado.pontos.coluna).toHaveLength(7);
  });
});

describe("refino da coluna (posterior)", () => {
  const POSTERIOR = {
    c7: { x: 500, y: 200 },
    eips_direita: { x: 600, y: 600 },
    eips_esquerda: { x: 400, y: 600 },
    coluna: [
      { x: 500, y: 200 },
      { x: 500, y: 400 },
      { x: 500, y: 600 },
    ],
  };

  function etapasComRefino(refino: () => unknown) {
    const recortes: unknown[] = [];
    const etapas: EtapasPostural = {
      ...etapasFake("posterior"),
      localizarPosterior: RunnableLambda.from(() => ({
        dados: POSTERIOR,
        uso: { entrada: 10, saida: 1 },
      })),
      refinarColuna: {
        recortar: async (img, caixa) => {
          recortes.push(caixa);
          return { ...img, base64: "RECORTE" };
        },
        localizar: RunnableLambda.from((img: { base64: string }) => {
          expect(img.base64).toBe("RECORTE");
          return refino() as { dados: { coluna: { x: number; y: number }[] }; uso: { entrada: number; saida: number } };
        }),
      },
    };
    return { etapas, recortes };
  }

  it("troca a coluna pela do recorte, convertida para a imagem inteira", async () => {
    const { etapas, recortes } = etapasComRefino(() => ({
      dados: { coluna: [{ x: 500, y: 0 }, { x: 600, y: 500 }, { x: 500, y: 1000 }] },
      uso: { entrada: 5, saida: 5 },
    }));
    const r = await criarPipelinePostural(etapas).invoke(IMAGEM);
    // caixa: x 0,28..0,72 (margem 0,12), y 0,16..0,66
    expect(recortes).toHaveLength(1);
    const caixa = recortes[0] as { x: number; y: number; w: number; h: number };
    expect(caixa.x).toBeCloseTo(0.28);
    expect(caixa.w).toBeCloseTo(0.44);
    expect(caixa.y).toBeCloseTo(0.16);
    expect(caixa.h).toBeCloseTo(0.5);
    if (r.resultado.vista !== "posterior") throw new Error("vista");
    const col = r.resultado.pontos.coluna!;
    expect(col[0].x).toBeCloseTo(500);
    expect(col[0].y).toBeCloseTo(160);
    expect(col[1].x).toBeCloseTo(544);
    expect(col[2].y).toBeCloseTo(660);
    expect(r.uso).toEqual({ entrada: 15, saida: 6 });
  });

  it("refino com erro mantém a coluna da localização", async () => {
    const { etapas } = etapasComRefino(() => {
      throw new Error("falhou");
    });
    const r = await criarPipelinePostural(etapas).invoke(IMAGEM);
    if (r.resultado.vista !== "posterior") throw new Error("vista");
    expect(r.resultado.pontos.coluna).toEqual(POSTERIOR.coluna);
  });

  it("refino com menos de 3 pontos é ignorado", async () => {
    const { etapas } = etapasComRefino(() => ({
      dados: { coluna: [{ x: 1, y: 1 }] },
      uso: { entrada: 0, saida: 0 },
    }));
    const r = await criarPipelinePostural(etapas).invoke(IMAGEM);
    if (r.resultado.vista !== "posterior") throw new Error("vista");
    expect(r.resultado.pontos.coluna).toEqual(POSTERIOR.coluna);
  });
});

describe("prepararImagem", () => {
  it("aplica a rotação EXIF, descarta metadados e limita a 2048 px", async () => {
    // 3000×1000 com orientação 6 (90°): o navegador mostra 1000×3000.
    const original = await sharp({
      create: { width: 3000, height: 1000, channels: 3, background: "#888" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const r = await prepararImagem(original);
    expect(r.mime).toBe("image/jpeg");
    const meta = await sharp(Buffer.from(r.base64, "base64")).metadata();
    expect([meta.width, meta.height]).toEqual([683, 2048]);
    expect(meta.orientation).toBeUndefined();
    expect(meta.exif).toBeUndefined();
  });
});
