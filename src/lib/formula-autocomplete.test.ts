import { describe, expect, it } from "vitest";
import {
  aplicarSugestao,
  filtrarSugestoes,
  SUGESTAO_ABS,
  SUGESTAO_SE,
  tokenNoCursor,
  type Sugestao,
  dentroDeAgregacao,
  SUGESTOES_AGREGACAO,
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

describe("autocomplete de ABS", () => {
  it("deixa o cursor dentro dos parênteses", () => {
    const { texto, cursor } = aplicarSugestao(
      "ab",
      { inicio: 0, fim: 2, prefixo: "ab" },
      SUGESTAO_ABS,
    );
    expect(texto).toBe("ABS()");
    expect(cursor).toBe(4);
  });
});

describe("autocomplete de agregação", () => {
  it("sugere as funções pelo começo do nome", () => {
    expect(filtrarSugestoes("so", SUGESTOES_AGREGACAO).map((s) => s.rotulo)).toEqual(["SOMA"]);
  });

  it("deixa o cursor dentro das chaves, pronto para escolher a coluna", () => {
    const soma = SUGESTOES_AGREGACAO[0];
    const { texto, cursor } = aplicarSugestao("so", { inicio: 0, fim: 2, prefixo: "so" }, soma);
    expect(texto).toBe("SOMA({})");
    expect(texto.slice(0, cursor)).toBe("SOMA({");
    const token = tokenNoCursor(texto, cursor)!;
    expect(token.prefixo).toBe("");
    expect(dentroDeAgregacao(texto, token.inicio)).toBe(true);
  });

  it("escolher o alvo substitui as chaves sem duplicar", () => {
    const texto = "SOMA({})";
    const token = tokenNoCursor(texto, 6)!;
    const r = aplicarSugestao(texto, token, {
      tipo: "coluna",
      rotulo: "Medidas > Valor",
      insercao: "{Medidas > Valor}",
    });
    expect(r.texto).toBe("SOMA({Medidas > Valor})");
  });

  it("referência comum não está em agregação", () => {
    expect(dentroDeAgregacao("{Peso} + ", 9)).toBe(false);
    expect(dentroDeAgregacao("MINHA(", 6)).toBe(false);
    expect(dentroDeAgregacao("média(", 6)).toBe(true);
  });
});
