import { describe, expect, it } from "vitest";
import {
  horaDePico,
  mesclarPlanos,
  montarHoras,
  montarSerieDiaria,
  percentual,
  topN,
} from "./metricas-montagem";

describe("topN", () => {
  it("lista vazia → vazio", () => expect(topN([])).toEqual([]));

  it("soma por chave, ordena e corta", () => {
    const r = topN(
      [
        { chave: "/b", total: 2 },
        { chave: "/a", total: 2 },
        { chave: "/c", total: 9 },
        { chave: "/b", total: 1 },
      ],
      2,
    );
    expect(r).toEqual([
      { chave: "/c", total: 9 },
      { chave: "/b", total: 3 },
    ]);
  });
});

describe("percentual", () => {
  it("total 0 ou negativo → 0, sem NaN", () => {
    expect(percentual(5, 0)).toBe(0);
    expect(percentual(0, 0)).toBe(0);
    expect(Number.isNaN(percentual(1, 0))).toBe(false);
  });
  it("arredonda", () => expect(percentual(1, 3)).toBe(33));
});

describe("montarSerieDiaria", () => {
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

  it("sem dados → todos os dias com 0 (período sem dados)", () => {
    const r = montarSerieDiaria([], d("2026-11-16"), d("2026-11-18"));
    expect(r).toEqual([
      { dia: "2026-11-16", total: 0 },
      { dia: "2026-11-17", total: 0 },
      { dia: "2026-11-18", total: 0 },
    ]);
  });

  it("preenche buracos e soma linhas do mesmo dia; atravessa virada de ano", () => {
    const r = montarSerieDiaria(
      [
        { dia: d("2026-12-31"), total: 2 },
        { dia: d("2026-12-31"), total: 3 },
        { dia: d("2027-01-02"), total: 1 },
      ],
      d("2026-12-30"),
      d("2027-01-02"),
    );
    expect(r).toEqual([
      { dia: "2026-12-30", total: 0 },
      { dia: "2026-12-31", total: 5 },
      { dia: "2027-01-01", total: 0 },
      { dia: "2027-01-02", total: 1 },
    ]);
  });
});

describe("horas", () => {
  it("converte hora UTC para Brasília (02:00 UTC = 23h do dia anterior)", () => {
    const horas = montarHoras([
      { hora: new Date("2026-11-18T02:00:00.000Z"), total: 4 },
      { hora: new Date("2026-11-18T15:00:00.000Z"), total: 7 },
      { hora: new Date("2026-11-19T15:00:00.000Z"), total: 1 },
    ]);
    expect(horas).toHaveLength(24);
    expect(horas[23]).toBe(4);
    expect(horas[12]).toBe(8);
  });

  it("sem dados → 24 zeros e sem pico", () => {
    const horas = montarHoras([]);
    expect(horas.every((h) => h === 0)).toBe(true);
    expect(horaDePico(horas)).toBeNull();
  });

  it("hora de pico", () => {
    const horas = montarHoras([{ hora: new Date("2026-11-18T15:00:00.000Z"), total: 3 }]);
    expect(horaDePico(horas)).toBe(12);
  });
});

describe("mesclarPlanos", () => {
  it("vazio → vazio", () => {
    expect(mesclarPlanos(new Map(), new Map(), new Map())).toEqual([]);
  });

  it("une as três contagens e ordena por atendimentos", () => {
    const r = mesclarPlanos(
      new Map([["Mensal", 2], ["Trimestral", 5]]),
      new Map([["Mensal", 1]]),
      new Map([["Mensal", 30], ["Antigo", 4]]),
    );
    expect(r.map((l) => l.planoNome)).toEqual(["Mensal", "Antigo", "Trimestral"]);
    expect(r[0]).toEqual({ planoNome: "Mensal", atribuicoes: 2, ativas: 1, atendimentos: 30 });
    expect(r[1]).toEqual({ planoNome: "Antigo", atribuicoes: 0, ativas: 0, atendimentos: 4 });
  });
});
