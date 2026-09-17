import { describe, expect, it } from "vitest";
import { agendamentoServicoPagamentoSchema, servicoSchema } from "./servico";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    nome: "Psicologia",
    ativo: true,
    valorPadrao: "150,00",
    taxaProfissionalPercentual: "20",
    salas: JSON.stringify([{ salaId: "sala-1", capacidade: "1", descricao: "" }]),
    profissionais: JSON.stringify(["user-1"]),
    ...overrides,
  };
}

describe("servicoSchema", () => {
  it("aceita um input válido", () => {
    const parsed = servicoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.salas).toEqual([{ salaId: "sala-1", capacidade: 1, descricao: "" }]);
      expect(parsed.data.profissionais).toEqual(["user-1"]);
    }
  });

  it("exige nome com pelo menos 2 caracteres", () => {
    expect(servicoSchema.safeParse(baseInput({ nome: "P" })).success).toBe(false);
  });

  it("não exige nenhuma sala configurada (serviço pode não usar sala)", () => {
    const parsed = servicoSchema.safeParse(baseInput({ salas: "[]" }));
    expect(parsed.success).toBe(true);
  });

  it("não exige nenhum profissional configurado", () => {
    const parsed = servicoSchema.safeParse(baseInput({ profissionais: "[]" }));
    expect(parsed.success).toBe(true);
  });

  it("rejeita capacidade inválida (zero, negativa ou não numérica)", () => {
    expect(
      servicoSchema.safeParse(
        baseInput({ salas: JSON.stringify([{ salaId: "sala-1", capacidade: "0" }]) }),
      ).success,
    ).toBe(false);
    expect(
      servicoSchema.safeParse(
        baseInput({ salas: JSON.stringify([{ salaId: "sala-1", capacidade: "-1" }]) }),
      ).success,
    ).toBe(false);
    expect(
      servicoSchema.safeParse(
        baseInput({ salas: JSON.stringify([{ salaId: "sala-1", capacidade: "abc" }]) }),
      ).success,
    ).toBe(false);
  });

  it("rejeita sala duplicada na lista", () => {
    const parsed = servicoSchema.safeParse(
      baseInput({
        salas: JSON.stringify([
          { salaId: "sala-1", capacidade: "1" },
          { salaId: "sala-1", capacidade: "2" },
        ]),
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejeita JSON malformado de salas/profissionais", () => {
    expect(servicoSchema.safeParse(baseInput({ salas: "{not json" })).success).toBe(false);
    expect(servicoSchema.safeParse(baseInput({ profissionais: "{not json" })).success).toBe(
      false,
    );
  });

  it("exige valor padrão positivo", () => {
    expect(servicoSchema.safeParse(baseInput({ valorPadrao: "" })).success).toBe(false);
    expect(servicoSchema.safeParse(baseInput({ valorPadrao: "0" })).success).toBe(false);
    expect(servicoSchema.safeParse(baseInput({ valorPadrao: "-10" })).success).toBe(false);
  });

  it("aceita taxa do profissional zero, mas rejeita negativa ou acima de 100", () => {
    expect(servicoSchema.safeParse(baseInput({ taxaProfissionalPercentual: "0" })).success).toBe(
      true,
    );
    expect(
      servicoSchema.safeParse(baseInput({ taxaProfissionalPercentual: "-1" })).success,
    ).toBe(false);
    expect(
      servicoSchema.safeParse(baseInput({ taxaProfissionalPercentual: "101" })).success,
    ).toBe(false);
  });
});

function basePagamento(overrides: Record<string, unknown> = {}) {
  return {
    valor: 150,
    formaPagamento: "A_VISTA",
    vencimentos: ["2026-09-20"],
    ...overrides,
  };
}

describe("agendamentoServicoPagamentoSchema", () => {
  it("aceita um pagamento à vista válido", () => {
    expect(agendamentoServicoPagamentoSchema.safeParse(basePagamento()).success).toBe(true);
  });

  it("aceita até 3 parcelas no cartão", () => {
    const parsed = agendamentoServicoPagamentoSchema.safeParse(
      basePagamento({
        formaPagamento: "ATE_3X_CARTAO",
        vencimentos: ["2026-09-20", "2026-10-20", "2026-11-20"],
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejeita mais de 1 parcela à vista", () => {
    const parsed = agendamentoServicoPagamentoSchema.safeParse(
      basePagamento({ vencimentos: ["2026-09-20", "2026-10-20"] }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejeita mais de 3 parcelas no cartão", () => {
    const parsed = agendamentoServicoPagamentoSchema.safeParse(
      basePagamento({
        formaPagamento: "ATE_3X_CARTAO",
        vencimentos: ["2026-09-20", "2026-10-20", "2026-11-20", "2026-12-20"],
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejeita valor zero, negativo ou ausente", () => {
    expect(agendamentoServicoPagamentoSchema.safeParse(basePagamento({ valor: 0 })).success).toBe(
      false,
    );
    expect(
      agendamentoServicoPagamentoSchema.safeParse(basePagamento({ valor: -10 })).success,
    ).toBe(false);
  });

  it("rejeita lista de vencimentos vazia", () => {
    expect(
      agendamentoServicoPagamentoSchema.safeParse(basePagamento({ vencimentos: [] })).success,
    ).toBe(false);
  });

  it("aceita virada de ano nos vencimentos", () => {
    const parsed = agendamentoServicoPagamentoSchema.safeParse(
      basePagamento({
        formaPagamento: "ATE_3X_CARTAO",
        vencimentos: ["2026-11-20", "2026-12-20", "2027-01-20"],
      }),
    );
    expect(parsed.success).toBe(true);
  });
});
