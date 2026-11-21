import { describe, expect, it } from "vitest";
import { RunnableLambda } from "@langchain/core/runnables";
import type { VistaPostural } from "./analise-postural";
import { criarPipelinePostural, etapasFake, type EtapasPostural } from "./analise-postural-pipeline";

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
    if (r.resultado.vista === "posterior") expect(Object.keys(r.resultado.pontos)).toHaveLength(12);
  });
});
