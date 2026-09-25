import { describe, expect, it } from "vitest";
import {
  aplicarTaxaNotaFiscal,
  calcularDesconto,
  calcularTaxaProfissional,
  calcularValorParcelado,
  cartaoDaForma,
  formaEfetiva,
  gerarDatasVencimento,
  gerarValoresParcelas,
  maxParcelasPlano,
  planoHibrido,
  valorPlano,
} from "./planos";

describe("planoHibrido", () => {
  it("é híbrido quando tem os dois tipos fixos", () => {
    expect(planoHibrido(["FISIOTERAPIA", "EDUCACAO_FISICA"])).toBe(true);
    expect(planoHibrido(["EDUCACAO_FISICA", "FISIOTERAPIA"])).toBe(true);
  });

  it("não é híbrido com só 1 tipo ou nenhum", () => {
    expect(planoHibrido(["FISIOTERAPIA"])).toBe(false);
    expect(planoHibrido(["EDUCACAO_FISICA"])).toBe(false);
    expect(planoHibrido([])).toBe(false);
  });
});

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
};

describe("valorPlano", () => {
  it("lê o valor à vista de acordo com a periodicidade", () => {
    expect(valorPlano(planoExemplo, "MENSAL")).toBe(100);
    expect(valorPlano(planoExemplo, "TRIMESTRAL")).toBe(270);
  });
});

describe("cartaoDaForma", () => {
  it("só ATE_3X_CARTAO é cartão", () => {
    expect(cartaoDaForma("ATE_3X_CARTAO")).toBe(true);
    expect(cartaoDaForma("A_VISTA")).toBe(false);
  });
});

describe("formaEfetiva", () => {
  it("mensal é sempre à vista sem parcelamento estendido", () => {
    expect(formaEfetiva("MENSAL", "ATE_3X_CARTAO")).toBe("A_VISTA");
    expect(formaEfetiva("MENSAL", "A_VISTA")).toBe("A_VISTA");
  });

  it("trimestral preserva a forma escolhida", () => {
    expect(formaEfetiva("TRIMESTRAL", "ATE_3X_CARTAO")).toBe("ATE_3X_CARTAO");
    expect(formaEfetiva("TRIMESTRAL", "A_VISTA")).toBe("A_VISTA");
  });

  it("mensal com parcelamento estendido respeita a forma escolhida", () => {
    expect(formaEfetiva("MENSAL", "ATE_3X_CARTAO", true)).toBe("ATE_3X_CARTAO");
    expect(formaEfetiva("MENSAL", "A_VISTA", true)).toBe("A_VISTA");
  });

  it("trimestral não muda com ou sem parcelamento estendido", () => {
    expect(formaEfetiva("TRIMESTRAL", "ATE_3X_CARTAO", true)).toBe("ATE_3X_CARTAO");
  });
});

describe("maxParcelasPlano", () => {
  it("mensal nunca parcela sem parcelamento estendido", () => {
    expect(maxParcelasPlano("MENSAL", "A_VISTA")).toBe(1);
    expect(maxParcelasPlano("MENSAL", "ATE_3X_CARTAO")).toBe(1);
  });

  it("trimestral à vista = 1, em até 3x no cartão = 3, sem parcelamento estendido", () => {
    expect(maxParcelasPlano("TRIMESTRAL", "A_VISTA")).toBe(1);
    expect(maxParcelasPlano("TRIMESTRAL", "ATE_3X_CARTAO")).toBe(3);
  });

  it("mensal com parcelamento estendido permite até 2x no cartão", () => {
    expect(maxParcelasPlano("MENSAL", "A_VISTA", true)).toBe(1);
    expect(maxParcelasPlano("MENSAL", "ATE_3X_CARTAO", true)).toBe(2);
  });

  it("trimestral com parcelamento estendido permite até 6x no cartão (à vista continua 1)", () => {
    expect(maxParcelasPlano("TRIMESTRAL", "A_VISTA", true)).toBe(1);
    expect(maxParcelasPlano("TRIMESTRAL", "ATE_3X_CARTAO", true)).toBe(6);
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

describe("calcularTaxaProfissional", () => {
  it("percentual 0 não retém nada", () => {
    expect(calcularTaxaProfissional(200, 0)).toBe(0);
  });

  it("percentual 100 retém o valor inteiro", () => {
    expect(calcularTaxaProfissional(200, 100)).toBe(200);
  });

  it("calcula o percentual sobre o valor da parcela", () => {
    expect(calcularTaxaProfissional(200, 20)).toBe(40);
  });

  it("arredonda em centavos", () => {
    expect(calcularTaxaProfissional(33.33, 15)).toBeCloseTo(5, 2);
  });

  it("valor 0 não gera taxa mesmo com percentual configurado", () => {
    expect(calcularTaxaProfissional(0, 50)).toBe(0);
  });
});

describe("calcularValorParcelado", () => {
  it("à vista (1 parcela) não tem taxa", () => {
    expect(calcularValorParcelado(270, 2.3, 1)).toBe(270);
  });

  it("0 parcelas também não tem taxa (evita divisão/uso indevido)", () => {
    expect(calcularValorParcelado(270, 2.3, 0)).toBe(270);
  });

  it("2x soma 2x o percentual sobre o valor à vista", () => {
    // 270 * (1 + 0.023 * 2) = 270 * 1.046 = 282.42
    expect(calcularValorParcelado(270, 2.3, 2)).toBeCloseTo(282.42, 2);
  });

  it("3x soma 3x o percentual sobre o valor à vista", () => {
    // 270 * (1 + 0.023 * 3) = 270 * 1.069 = 288.63
    expect(calcularValorParcelado(270, 2.3, 3)).toBeCloseTo(288.63, 2);
  });

  it("6x soma 6x o percentual sobre o valor à vista", () => {
    // 270 * (1 + 0.023 * 6) = 270 * 1.138 = 307.26
    expect(calcularValorParcelado(270, 2.3, 6)).toBeCloseTo(307.26, 2);
  });

  it("taxa 0% não altera o valor, mesmo parcelado", () => {
    expect(calcularValorParcelado(270, 0, 3)).toBe(270);
  });

  it("arredonda em centavos", () => {
    expect(calcularValorParcelado(33.33, 2.3, 2)).toBeCloseTo(34.86, 2);
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
