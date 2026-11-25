import { describe, expect, it } from "vitest";
import { expandirSvg, type NoSvg } from "./svg-arvore";
import { FormaSvg } from "@/components/pacientes/anotacoes-camada";
import type { Anotacoes, Forma } from "./anotacoes-imagem";

const anotacoes: Anotacoes = { versao: 1, largura: 1000, altura: 500, calibracao: null, formas: [] };

function tags(nos: (NoSvg | string)[]): string[] {
  return nos.flatMap((n) => (typeof n === "string" ? [] : [n.tag, ...tags(n.filhos)]));
}

function textos(nos: (NoSvg | string)[]): string[] {
  return nos.flatMap((n) => (typeof n === "string" ? [n] : textos(n.filhos)));
}

describe("expandirSvg", () => {
  it("ignora null/false e achata arrays e fragments", () => {
    expect(expandirSvg([null, false, "a", 1, <>{"b"}</>])).toEqual(["a", "1", "b"]);
  });

  it("chama componentes puros e devolve só tags nativas com props camelCase", () => {
    const forma: Forma = {
      id: "m1",
      cor: "#ff0000",
      tipo: "medida",
      a: { x: 0, y: 0.5 },
      b: { x: 0.5, y: 0.5 },
    };
    const nos = expandirSvg(<FormaSvg forma={forma} anotacoes={anotacoes} />);
    expect(tags(nos)).toEqual(["g", "g", "line", "circle", "circle", "text"]);
    expect(textos(nos)).toEqual(["500 px"]);
    const linha = (nos[0] as NoSvg).filhos[0] as NoSvg;
    expect(linha.props).toMatchObject({ stroke: "#ff0000", strokeLinecap: "round" });
  });

  it("rótulo com várias linhas vira text + tspan", () => {
    const forma: Forma = {
      id: "r1",
      cor: "#2563eb",
      tipo: "rotulo",
      pos: { x: 0.5, y: 0.2 },
      alvo: { x: 0.6, y: 0.4 },
      texto: "Linha acromial",
      titulo: "C7",
      estilo: "marco",
    };
    const nos = expandirSvg(<FormaSvg forma={forma} anotacoes={anotacoes} />);
    expect(tags(nos)).toContain("tspan");
    expect(textos(nos).join(" ")).toContain("C7");
  });
});
