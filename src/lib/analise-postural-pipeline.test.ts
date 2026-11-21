import { describe, expect, it } from "vitest";
import { RunnableLambda } from "@langchain/core/runnables";
import type { VistaPostural } from "./analise-postural";
import { criarPipelinePostural, etapasFake, type EtapasPostural } from "./analise-postural-pipeline";

const IMAGEM = { base64: "AAAA", mime: "image/jpeg" };

/** Etapas fake que contam chamadas e cobram tokens fixos. */
function etapasContadas(vista: VistaPostural) {
  const chamadas = { classificar: 0, frontal: 0, lateral: 0 };
  const etapas: EtapasPostural = {
    classificar: RunnableLambda.from(() => {
      chamadas.classificar++;
      return { dados: { vista, confianca: 0.9 }, uso: { entrada: 100, saida: 10 } };
    }),
    localizarFrontal: RunnableLambda.from((x) => {
      chamadas.frontal++;
      expect(x.vista).toBe(vista);
      expect(x.base64).toBe(IMAGEM.base64);
      return { dados: { ombro_direito: { x: 1, y: 2 } }, uso: { entrada: 200, saida: 20 } };
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
    expect(chamadas).toEqual({ classificar: 1, frontal: 0, lateral: 0 });
  });

  it.each(["anterior", "posterior"] as const)("%s vai para a etapa frontal", async (vista) => {
    const { etapas, chamadas } = etapasContadas(vista);
    const r = await criarPipelinePostural(etapas).invoke(IMAGEM);
    expect(r.resultado).toEqual({ vista, confianca: 0.9, pontos: { ombro_direito: { x: 1, y: 2 } } });
    expect(r.uso).toEqual({ entrada: 300, saida: 30 });
    expect(chamadas).toEqual({ classificar: 1, frontal: 1, lateral: 0 });
  });

  it.each(["lateral_direita", "lateral_esquerda"] as const)(
    "%s vai para a etapa lateral",
    async (vista) => {
      const { etapas, chamadas } = etapasContadas(vista);
      const r = await criarPipelinePostural(etapas).invoke(IMAGEM);
      expect(r.resultado).toEqual({ vista, confianca: 0.9, pontos: { trago: { x: 3, y: 4 } } });
      expect(r.uso).toEqual({ entrada: 400, saida: 40 });
      expect(chamadas).toEqual({ classificar: 1, frontal: 0, lateral: 1 });
    },
  );

  it("propaga erro de uma etapa", async () => {
    const { etapas } = etapasContadas("anterior");
    etapas.localizarFrontal = RunnableLambda.from(() => {
      throw new Error("timeout");
    });
    await expect(criarPipelinePostural(etapas).invoke(IMAGEM)).rejects.toThrow("timeout");
  });

  it("etapas fake produzem resultado completo", async () => {
    const r = await criarPipelinePostural(etapasFake("posterior")).invoke(IMAGEM);
    expect(r.resultado.vista).toBe("posterior");
    if (r.resultado.vista === "posterior") expect(r.resultado.pontos.coluna).toHaveLength(5);
  });
});
