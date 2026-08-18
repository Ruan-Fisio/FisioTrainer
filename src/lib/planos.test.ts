import { describe, expect, it } from "vitest";
import { aplicarTaxaCartao, gerarValoresParcelas } from "./planos";

describe("gerarValoresParcelas", () => {
  it("divide o valor igualmente quando é exato", () => {
    expect(gerarValoresParcelas(300, 3)).toEqual([100, 100, 100]);
  });

  it("ajusta o arredondamento de centavos na última parcela", () => {
    const valores = gerarValoresParcelas(100, 3);
    expect(valores[0]).toBeCloseTo(33.33, 2);
    expect(valores[1]).toBeCloseTo(33.33, 2);
    expect(valores[2]).toBeCloseTo(33.34, 2);
    const soma = valores.reduce((a, b) => a + b, 0);
    expect(Math.round(soma * 100) / 100).toBe(100);
  });

  it("retorna o valor total como parcela única quando numeroParcelas é 1", () => {
    expect(gerarValoresParcelas(700, 1)).toEqual([700]);
  });
});

describe("aplicarTaxaCartao", () => {
  it("não altera o valor quando cartao é false", () => {
    expect(aplicarTaxaCartao(100, 5, false)).toBe(100);
  });

  it("não altera o valor quando taxaCartao é 0", () => {
    expect(aplicarTaxaCartao(100, 0, true)).toBe(100);
  });

  it("aplica a taxa percentual quando cartao é true", () => {
    expect(aplicarTaxaCartao(100, 5, true)).toBe(105);
  });

  it("arredonda para centavos", () => {
    expect(aplicarTaxaCartao(33.33, 3.7, true)).toBeCloseTo(34.56, 2);
  });
});
