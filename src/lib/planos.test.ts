import { describe, expect, it } from "vitest";
import {
  aplicarTaxaNotaFiscal,
  calcularDesconto,
  cartaoDaForma,
  formaEfetiva,
  gerarDatasVencimento,
  gerarValoresParcelas,
  maxParcelasPlano,
  valorPlano,
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

const planoExemplo = {
  valorAVistaMensal: 100,
  valorAVistaTrimestral: 270,
  valorAte3xTrimestral: 297,
};

describe("valorPlano", () => {
  it("mensal usa sempre o valor à vista mensal", () => {
    expect(valorPlano(planoExemplo, "A_VISTA", "MENSAL")).toBe(100);
    expect(valorPlano(planoExemplo, "ATE_3X_CARTAO", "MENSAL")).toBe(100);
  });

  it("trimestral distingue à vista e até 3x no cartão", () => {
    expect(valorPlano(planoExemplo, "A_VISTA", "TRIMESTRAL")).toBe(270);
    expect(valorPlano(planoExemplo, "ATE_3X_CARTAO", "TRIMESTRAL")).toBe(297);
  });
});

describe("cartaoDaForma", () => {
  it("só ATE_3X_CARTAO é cartão", () => {
    expect(cartaoDaForma("ATE_3X_CARTAO")).toBe(true);
    expect(cartaoDaForma("A_VISTA")).toBe(false);
  });
});

describe("formaEfetiva", () => {
  it("mensal é sempre à vista", () => {
    expect(formaEfetiva("MENSAL", "ATE_3X_CARTAO")).toBe("A_VISTA");
    expect(formaEfetiva("MENSAL", "A_VISTA")).toBe("A_VISTA");
  });

  it("trimestral preserva a forma escolhida", () => {
    expect(formaEfetiva("TRIMESTRAL", "ATE_3X_CARTAO")).toBe("ATE_3X_CARTAO");
    expect(formaEfetiva("TRIMESTRAL", "A_VISTA")).toBe("A_VISTA");
  });
});

describe("maxParcelasPlano", () => {
  it("mensal nunca parcela", () => {
    expect(maxParcelasPlano("MENSAL", "A_VISTA")).toBe(1);
    expect(maxParcelasPlano("MENSAL", "ATE_3X_CARTAO")).toBe(1);
  });

  it("trimestral à vista = 1, em até 3x no cartão = 3", () => {
    expect(maxParcelasPlano("TRIMESTRAL", "A_VISTA")).toBe(1);
    expect(maxParcelasPlano("TRIMESTRAL", "ATE_3X_CARTAO")).toBe(3);
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
