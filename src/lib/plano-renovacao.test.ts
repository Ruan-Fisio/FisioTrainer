import { describe, expect, it } from "vitest";
import {
  contarRealizados,
  planoRenovavel,
  totalAtendimentosPlano,
} from "./plano-renovacao";

const pago = (n: number) => Array.from({ length: n }, () => ({ status: "PAGO" }));
const ag = (status: string, n: number) =>
  Array.from({ length: n }, () => ({ status }));

describe("plano-renovacao", () => {
  it("totalAtendimentosPlano = atendimentos × meses por periodicidade", () => {
    expect(totalAtendimentosPlano(4, "MENSAL")).toBe(4);
    expect(totalAtendimentosPlano(8, "TRIMESTRAL")).toBe(24);
    expect(totalAtendimentosPlano(null, "MENSAL")).toBeNull();
  });

  it("contarRealizados conta só COMPARECEU e FALTOU", () => {
    expect(
      contarRealizados([
        ...ag("COMPARECEU", 2),
        ...ag("FALTOU", 1),
        ...ag("AGENDADO", 3),
        ...ag("CANCELADO", 5),
      ]),
    ).toBe(3);
  });

  it("renovável: MENSAL 4x, 4 realizados, tudo pago, nada agendado", () => {
    expect(
      planoRenovavel({
        atendimentos: 4,
        periodicidade: "MENSAL",
        cobrancas: pago(1),
        agendamentos: [...ag("COMPARECEU", 3), ...ag("FALTOU", 1)],
      }),
    ).toBe(true);
  });

  it("NÃO renovável: alguma cobrança pendente", () => {
    expect(
      planoRenovavel({
        atendimentos: 4,
        periodicidade: "MENSAL",
        cobrancas: [{ status: "PAGO" }, { status: "PENDENTE" }],
        agendamentos: ag("COMPARECEU", 4),
      }),
    ).toBe(false);
  });

  it("NÃO renovável: ainda há agendamento AGENDADO", () => {
    expect(
      planoRenovavel({
        atendimentos: 4,
        periodicidade: "MENSAL",
        cobrancas: pago(1),
        agendamentos: [...ag("COMPARECEU", 3), ...ag("AGENDADO", 1)],
      }),
    ).toBe(false);
  });

  it("NÃO renovável: realizados abaixo do total", () => {
    expect(
      planoRenovavel({
        atendimentos: 4,
        periodicidade: "MENSAL",
        cobrancas: pago(1),
        agendamentos: ag("COMPARECEU", 3),
      }),
    ).toBe(false);
  });

  it("TRIMESTRAL 8x exige 24 realizados", () => {
    const base = {
      atendimentos: 8,
      periodicidade: "TRIMESTRAL" as const,
      cobrancas: pago(3),
    };
    expect(planoRenovavel({ ...base, agendamentos: ag("COMPARECEU", 23) })).toBe(false);
    expect(planoRenovavel({ ...base, agendamentos: ag("COMPARECEU", 24) })).toBe(true);
  });

  it("NÃO renovável: sem cobranças", () => {
    expect(
      planoRenovavel({
        atendimentos: 4,
        periodicidade: "MENSAL",
        cobrancas: [],
        agendamentos: ag("COMPARECEU", 4),
      }),
    ).toBe(false);
  });

  it("atendimentos null: basta nada agendado + ao menos 1 realizado", () => {
    expect(
      planoRenovavel({
        atendimentos: null,
        periodicidade: "MENSAL",
        cobrancas: pago(1),
        agendamentos: ag("COMPARECEU", 1),
      }),
    ).toBe(true);
    expect(
      planoRenovavel({
        atendimentos: null,
        periodicidade: "MENSAL",
        cobrancas: pago(1),
        agendamentos: [],
      }),
    ).toBe(false);
  });
});
