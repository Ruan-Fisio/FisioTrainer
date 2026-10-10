import { describe, expect, it } from "vitest";
import {
  coresAlinhadasParaPersistir,
  coresPersistidasParaAlinhar,
  mapaCoresOpcoes,
  parseCoresOpcoes,
} from "./cor-opcao";

describe("parseCoresOpcoes", () => {
  it("normaliza o Json do Prisma", () => {
    expect(
      parseCoresOpcoes([
        { opcao: "Baixo", cor: "VERDE" },
        { opcao: "Alto", cor: "VERMELHO" },
      ]),
    ).toEqual([
      { opcao: "Baixo", cor: "VERDE" },
      { opcao: "Alto", cor: "VERMELHO" },
    ]);
  });

  it("trata formato inesperado, cor desconhecida e null como sem destaque", () => {
    expect(parseCoresOpcoes(null)).toEqual([]);
    expect(parseCoresOpcoes({})).toEqual([]);
    expect(
      parseCoresOpcoes([
        { opcao: "A", cor: "ROXO" },
        { opcao: 1, cor: "VERDE" },
        null,
        "x",
        { opcao: "B", cor: "AMARELO" },
      ]),
    ).toEqual([{ opcao: "B", cor: "AMARELO" }]);
  });
});

describe("mapaCoresOpcoes", () => {
  it("indexa por texto da opção (inclusive com vírgula)", () => {
    const mapa = mapaCoresOpcoes([
      { opcao: "Positivo = dor, irradiação", cor: "VERMELHO" },
    ]);
    expect(mapa.get("Positivo = dor, irradiação")).toBe("VERMELHO");
    expect(mapa.get("Negativo")).toBeUndefined();
  });
});

describe("coresAlinhadasParaPersistir", () => {
  it("descarta opção sem cor, cor inválida e opção vazia", () => {
    expect(
      coresAlinhadasParaPersistir(
        ["Normal", "Moderado", "Alto", ""],
        ["VERDE", "", "VERMELHO", "AMARELO"],
      ),
    ).toEqual([
      { opcao: "Normal", cor: "VERDE" },
      { opcao: "Alto", cor: "VERMELHO" },
    ]);
    expect(coresAlinhadasParaPersistir(["A"], ["ROXO"])).toEqual([]);
  });

  it("array de cores mais curto que as opções não quebra", () => {
    expect(coresAlinhadasParaPersistir(["A", "B"], ["AMARELO"])).toEqual([
      { opcao: "A", cor: "AMARELO" },
    ]);
  });

  it("opção repetida fica com a primeira cor", () => {
    expect(
      coresAlinhadasParaPersistir(["A", "A"], ["VERDE", "VERMELHO"]),
    ).toEqual([{ opcao: "A", cor: "VERDE" }]);
  });
});

describe("coresPersistidasParaAlinhar", () => {
  it("devolve array alinhado com as opções, vazio onde não há cor", () => {
    expect(
      coresPersistidasParaAlinhar(
        ["Normal", "Moderado", "Alto"],
        [
          { opcao: "Alto", cor: "VERMELHO" },
          { opcao: "Normal", cor: "VERDE" },
        ],
      ),
    ).toEqual(["VERDE", "", "VERMELHO"]);
  });

  it("roundtrip", () => {
    const opcoes = ["A", "B", "C"];
    const cores = ["VERMELHO", "", "AMARELO"];
    expect(
      coresPersistidasParaAlinhar(
        opcoes,
        coresAlinhadasParaPersistir(opcoes, cores),
      ),
    ).toEqual(cores);
  });
});
