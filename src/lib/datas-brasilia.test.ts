import { describe, expect, it } from "vitest";
import {
  fimDaSemana,
  fimDoDia,
  fimDoMes,
  inicioDoDia,
  inicioDoMes,
  inicioDoProximoMes,
} from "./datas-brasilia";

// Quarta-feira, 3 de setembro de 2026, 22:30 em Brasília (= 04/09 01:30 UTC).
const ref = new Date("2026-09-04T01:30:00Z");

const brt = (d: Date) =>
  d.toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" });

describe("limites de data no fuso da clínica", () => {
  it("início/fim do dia ficam no dia-calendário de Brasília, não de UTC", () => {
    expect(brt(inicioDoDia(ref))).toBe("2026-09-03 00:00:00");
    expect(brt(fimDoDia(ref))).toBe("2026-09-03 23:59:59");
  });

  it("fim da semana é o sábado seguinte (semana começa domingo)", () => {
    expect(brt(fimDaSemana(ref))).toBe("2026-09-05 23:59:59");
  });

  it("fim do mês respeita a quantidade de dias do mês", () => {
    expect(brt(fimDoMes(ref))).toBe("2026-09-30 23:59:59");
    expect(brt(fimDoMes(new Date("2026-03-10T12:00:00Z")))).toBe(
      "2026-03-31 23:59:59",
    );
    expect(brt(fimDoMes(new Date("2028-02-10T12:00:00Z")))).toBe(
      "2028-02-29 23:59:59",
    );
  });

  it("um evento de sábado à noite ainda conta na semana", () => {
    const sabadoNoite = new Date("2026-09-06T01:00:00Z"); // 05/09 22:00 BRT
    expect(sabadoNoite <= fimDaSemana(ref)).toBe(true);
  });

  it("início do mês e início do mês seguinte (com virada de ano)", () => {
    expect(brt(inicioDoMes(ref))).toBe("2026-09-01 00:00:00");
    expect(brt(inicioDoProximoMes(ref))).toBe("2026-10-01 00:00:00");
    const dez = new Date("2026-12-20T12:00:00Z");
    expect(brt(inicioDoProximoMes(dez))).toBe("2027-01-01 00:00:00");
  });
});
