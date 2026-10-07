import { describe, expect, it } from "vitest";
import { contarPalavras } from "./texto";

describe("contarPalavras", () => {
  it("retorna 0 para vazio ou só espaços", () => {
    expect(contarPalavras("")).toBe(0);
    expect(contarPalavras("  \n\t ")).toBe(0);
  });
  it("ignora espaços múltiplos e conta quebras de linha", () => {
    expect(contarPalavras("  dor   no\njoelho ")).toBe(3);
  });
  it("conta no limite de 2000 palavras", () => {
    expect(contarPalavras(Array(2000).fill("a").join(" "))).toBe(2000);
    expect(contarPalavras(Array(2001).fill("a").join(" "))).toBe(2001);
  });
});
