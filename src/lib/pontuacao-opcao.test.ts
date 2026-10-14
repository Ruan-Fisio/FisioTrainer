import { describe, expect, it } from "vitest";
import {
  mapaPontuacoes,
  parsePontosTexto,
  parsePontuacoes,
  pontuacoesAlinhadasParaPersistir,
  pontuacoesPersistidasParaAlinhar,
  selecionadasDoValor,
  somarPontuacao,
} from "./pontuacao-opcao";
import { serializeSelecionadas } from "./multipla-escolha";

describe("parsePontosTexto", () => {
  it("aceita inteiro, decimal com ponto ou vírgula e sinal", () => {
    expect(parsePontosTexto("3")).toBe(3);
    expect(parsePontosTexto("1.5")).toBe(1.5);
    expect(parsePontosTexto("1,5")).toBe(1.5);
    expect(parsePontosTexto("-2")).toBe(-2);
    expect(parsePontosTexto(" 0 ")).toBe(0);
  });

  it("vazio ou inválido vira null", () => {
    expect(parsePontosTexto("")).toBeNull();
    expect(parsePontosTexto("-")).toBeNull();
    expect(parsePontosTexto("abc")).toBeNull();
    expect(parsePontosTexto("1,2,3")).toBeNull();
  });
});

describe("parsePontuacoes / mapaPontuacoes", () => {
  it("normaliza o Json do Prisma e ignora formato inesperado", () => {
    expect(
      parsePontuacoes([
        { opcao: "Nunca", pontos: 0 },
        { opcao: "Sempre", pontos: 3 },
        { opcao: "Quebrada", pontos: "x" },
        null,
      ]),
    ).toEqual([
      { opcao: "Nunca", pontos: 0 },
      { opcao: "Sempre", pontos: 3 },
    ]);
    expect(parsePontuacoes(null)).toEqual([]);
    expect(parsePontuacoes("lixo")).toEqual([]);
  });

  it("mapa opção → pontos", () => {
    const mapa = mapaPontuacoes([{ opcao: "A", pontos: 2 }]);
    expect(mapa.get("A")).toBe(2);
    expect(mapa.get("B")).toBeUndefined();
  });
});

describe("pontuacoesAlinhadasParaPersistir / pontuacoesPersistidasParaAlinhar", () => {
  it("converte textos alinhados por índice e descarta inválidos/repetidos", () => {
    expect(
      pontuacoesAlinhadasParaPersistir(["A", "B", "", "A", "C"], ["1", "2,5", "9", "7", ""]),
    ).toEqual([
      { opcao: "A", pontos: 1 },
      { opcao: "B", pontos: 2.5 },
    ]);
  });

  it("roundtrip preserva pontos e deixa '' onde não há", () => {
    const persistido = pontuacoesAlinhadasParaPersistir(["A", "B"], ["0", "-1"]);
    expect(pontuacoesPersistidasParaAlinhar(["A", "B", "C"], persistido)).toEqual([
      "0",
      "-1",
      "",
    ]);
  });
});

describe("somarPontuacao", () => {
  const pontuacoes = [
    { opcao: "Leve, ocasional", pontos: 1 },
    { opcao: "Moderado", pontos: 2 },
    { opcao: "Grave", pontos: 4 },
  ];

  it("soma as opções marcadas", () => {
    expect(somarPontuacao(["Moderado", "Grave"], pontuacoes)).toBe(6);
  });

  it("seleção vazia = sem valor (não zero)", () => {
    expect(somarPontuacao([], pontuacoes)).toBeUndefined();
  });

  it("opção marcada sem pontuação cadastrada é ignorada", () => {
    expect(somarPontuacao(["Removida", "Grave"], pontuacoes)).toBe(4);
    expect(somarPontuacao(["Removida"], pontuacoes)).toBeUndefined();
  });

  it("zero marcado é valor (diferente de nada marcado)", () => {
    expect(somarPontuacao(["Nunca"], [{ opcao: "Nunca", pontos: 0 }])).toBe(0);
  });
});

describe("selecionadasDoValor", () => {
  it("única: o valor é a própria opção, mesmo com vírgula no texto", () => {
    expect(selecionadasDoValor("Leve, ocasional", false)).toEqual(["Leve, ocasional"]);
  });

  it("múltipla: parse com delimitador, sem quebrar por vírgula", () => {
    const valor = serializeSelecionadas(["Leve, ocasional", "Grave"]);
    expect(selecionadasDoValor(valor, true)).toEqual(["Leve, ocasional", "Grave"]);
  });

  it("vazio devolve lista vazia", () => {
    expect(selecionadasDoValor("", true)).toEqual([]);
    expect(selecionadasDoValor("", false)).toEqual([]);
  });
});
