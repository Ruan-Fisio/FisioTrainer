import { describe, expect, it } from "vitest";
import {
  aplicarTaxaCartao,
  aplicarTaxaNotaFiscal,
  calcularDesconto,
  gerarDatasVencimento,
  gerarValoresParcelas,
} from "./planos";

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

describe("calcularDesconto", () => {
  it("não aplica desconto quando o tipo é NENHUM", () => {
    expect(calcularDesconto(500, "NENHUM", 0, 0, 5)).toEqual({ valor: 500, desconto: 0 });
  });

  it("aplica desconto em valor fixo", () => {
    expect(calcularDesconto(500, "VALOR", 50, 0, 5)).toEqual({ valor: 450, desconto: 50 });
  });

  it("aplica desconto percentual", () => {
    expect(calcularDesconto(500, "PERCENTUAL", 10, 0, 5)).toEqual({ valor: 450, desconto: 50 });
  });

  it("calcula o desconto necessário para atingir o valor alvo por parcela", () => {
    expect(calcularDesconto(500, "ALVO_PARCELA", 0, 90, 5)).toEqual({
      valor: 450,
      desconto: 50,
    });
  });

  it("não gera desconto negativo quando o valor alvo é maior que o valor original", () => {
    expect(calcularDesconto(500, "ALVO_PARCELA", 0, 200, 5)).toEqual({
      valor: 500,
      desconto: 0,
    });
  });

  it("limita o desconto em valor fixo ao valor original", () => {
    expect(calcularDesconto(100, "VALOR", 500, 0, 1)).toEqual({ valor: 0, desconto: 100 });
  });

  it("limita o desconto percentual a 100%", () => {
    expect(calcularDesconto(100, "PERCENTUAL", 150, 0, 1)).toEqual({ valor: 0, desconto: 100 });
  });
});

describe("aplicarTaxaNotaFiscal", () => {
  it("não altera o valor quando notaFiscal é false", () => {
    expect(aplicarTaxaNotaFiscal(100, false)).toBe(100);
  });

  it("aplica 7% quando notaFiscal é true", () => {
    expect(aplicarTaxaNotaFiscal(100, true)).toBe(107);
  });

  it("arredonda para centavos", () => {
    expect(aplicarTaxaNotaFiscal(33.33, true)).toBeCloseTo(35.66, 2);
  });
});

describe("gerarDatasVencimento", () => {
  it("gera uma única parcela na data informada", () => {
    expect(gerarDatasVencimento("2026-08-10", 1)).toEqual(["2026-08-10"]);
  });

  it("gera as parcelas seguintes no mesmo dia dos meses seguintes", () => {
    expect(gerarDatasVencimento("2026-08-10", 3)).toEqual([
      "2026-08-10",
      "2026-09-10",
      "2026-10-10",
    ]);
  });

  it("ajusta para o último dia do mês quando ele não existir", () => {
    expect(gerarDatasVencimento("2026-01-31", 3)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("avança o ano corretamente ao cruzar dezembro", () => {
    expect(gerarDatasVencimento("2026-11-15", 3)).toEqual([
      "2026-11-15",
      "2026-12-15",
      "2027-01-15",
    ]);
  });
});
