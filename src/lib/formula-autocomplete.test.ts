import { describe, expect, it } from "vitest";
import {
  aplicarSugestao,
  filtrarSugestoes,
  SUGESTAO_SE,
  tokenNoCursor,
  type Sugestao,
} from "./formula-autocomplete";

const itens: Sugestao[] = [
  { tipo: "coluna", rotulo: "Peso", insercao: "{Peso}" },
  { tipo: "coluna", rotulo: "Altura", insercao: "{Altura}" },
  { tipo: "variavel", rotulo: "Soma das dobras", insercao: "{Soma das dobras}" },
  { tipo: "paciente", rotulo: "Idade", insercao: "{Idade}" },
  SUGESTAO_SE,
];

describe("tokenNoCursor", () => {
  it("pega o trecho dentro de uma chave aberta", () => {
    expect(tokenNoCursor("{Pe", 3)).toEqual({ inicio: 0, fim: 3, prefixo: "Pe" });
    expect(tokenNoCursor("1 + {So", 7)).toEqual({ inicio: 4, fim: 7, prefixo: "So" });
  });
  it("inclui a chave de fechamento colada ao cursor", () => {
    expect(tokenNoCursor("{Pe}", 3)).toEqual({ inicio: 0, fim: 4, prefixo: "Pe" });
  });
  it("pega palavra sem chave e ignora chave já fechada", () => {
    expect(tokenNoCursor("1 + Pe", 6)).toEqual({ inicio: 4, fim: 6, prefixo: "Pe" });
    expect(tokenNoCursor("{Peso} + ", 9)).toBeNull();
    expect(tokenNoCursor("{Peso}", 6)).toBeNull();
  });
  it("não sugere em cima de número", () => {
    expect(tokenNoCursor("{Peso} > 18", 11)).toBeNull();
  });
});

describe("filtrarSugestoes", () => {
  it("prefixo antes de 'contém', sem diferenciar acento/caixa", () => {
    expect(filtrarSugestoes("a", itens).map((i) => i.rotulo)).toEqual([
      "Altura",
      "Soma das dobras",
      "Idade",
    ]);
    expect(filtrarSugestoes("ALT", itens).map((i) => i.rotulo)).toEqual(["Altura"]);
    expect(filtrarSugestoes("se", itens).map((i) => i.rotulo)).toEqual(["SE"]);
  });
  it("prefixo vazio lista tudo (até o limite)", () => {
    expect(filtrarSugestoes("", itens, 3)).toHaveLength(3);
  });
});

describe("aplicarSugestao", () => {
  it("troca o trecho digitado e posiciona o cursor", () => {
    expect(aplicarSugestao("1 + {Pe", { inicio: 4, fim: 7, prefixo: "Pe" }, itens[0])).toEqual({
      texto: "1 + {Peso}",
      cursor: 10,
    });
    expect(aplicarSugestao("S", { inicio: 0, fim: 1, prefixo: "S" }, SUGESTAO_SE)).toEqual({
      texto: "SE(; ; )",
      cursor: 3,
    });
  });
});
