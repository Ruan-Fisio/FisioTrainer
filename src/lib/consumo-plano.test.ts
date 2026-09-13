import { describe, expect, it } from "vitest";
import { podeAgendarMais, slotsVaziosNoMes } from "./consumo-plano";

describe("consumo-plano", () => {
  describe("slotsVaziosNoMes", () => {
    it("mês com folga e plano com folga: mostra o que sobra no mês", () => {
      expect(
        slotsVaziosNoMes({ capacidadeMes: 4, usadosNoMes: 1, disponivelNoPlano: 10 }),
      ).toBe(3);
    });

    it("caso do bug: MENSAL 4x, 3 no mês, plano já com 4/4 → nenhum slot vazio", () => {
      expect(
        slotsVaziosNoMes({ capacidadeMes: 4, usadosNoMes: 3, disponivelNoPlano: 0 }),
      ).toBe(0);
    });

    it("plano limita mais que o mês: mostra só o que o plano permite", () => {
      expect(
        slotsVaziosNoMes({ capacidadeMes: 8, usadosNoMes: 2, disponivelNoPlano: 3 }),
      ).toBe(3);
    });

    it("mês já cheio → 0, mesmo com folga no plano", () => {
      expect(
        slotsVaziosNoMes({ capacidadeMes: 4, usadosNoMes: 4, disponivelNoPlano: 5 }),
      ).toBe(0);
    });

    it("plano sem limite: só o que sobra no mês", () => {
      expect(
        slotsVaziosNoMes({ capacidadeMes: 4, usadosNoMes: 1, disponivelNoPlano: null }),
      ).toBe(3);
    });
  });

  describe("podeAgendarMais", () => {
    const base = { capacidadeMes: 4, usadosNoMes: 2, totalPlano: 4, usadosNoPlano: 3 };

    it("dentro dos dois limites → true", () => {
      expect(podeAgendarMais(base)).toBe(true);
    });

    it("total do plano atingido → false (mesmo com folga no mês)", () => {
      expect(podeAgendarMais({ ...base, usadosNoPlano: 4 })).toBe(false);
    });

    it("mês cheio → false (mesmo com folga no total)", () => {
      expect(
        podeAgendarMais({ capacidadeMes: 4, usadosNoMes: 4, totalPlano: 12, usadosNoPlano: 8 }),
      ).toBe(false);
    });

    it("plano sem limites → true", () => {
      expect(
        podeAgendarMais({ capacidadeMes: null, usadosNoMes: 9, totalPlano: null, usadosNoPlano: 99 }),
      ).toBe(true);
    });
  });
});
