import { describe, expect, it } from "vitest";
import { creditosDisponiveis, semCreditos } from "./remarcacao-creditos";

describe("creditosDisponiveis", () => {
  it("subtrai os usados do máximo", () => {
    expect(creditosDisponiveis(3, 0)).toBe(3);
    expect(creditosDisponiveis(3, 2)).toBe(1);
    expect(creditosDisponiveis(3, 3)).toBe(0);
  });

  it("nunca fica negativo (clínica pode forçar além do limite)", () => {
    expect(creditosDisponiveis(3, 5)).toBe(0);
  });

  it("plano sem créditos configurados = 0", () => {
    expect(creditosDisponiveis(0, 0)).toBe(0);
  });
});

describe("semCreditos", () => {
  it("false enquanto há saldo", () => {
    expect(semCreditos(3, 0)).toBe(false);
    expect(semCreditos(3, 2)).toBe(false);
  });

  it("true ao atingir ou passar o máximo", () => {
    expect(semCreditos(3, 3)).toBe(true);
    expect(semCreditos(3, 4)).toBe(true);
  });

  it("true quando o plano não tem créditos", () => {
    expect(semCreditos(0, 0)).toBe(true);
  });
});
