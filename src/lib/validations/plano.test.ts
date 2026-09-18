import { describe, expect, it } from "vitest";
import { planoSchema } from "./plano";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    nome: "Mensal Fisioterapia",
    descricao: "",
    tipos: ["FISIOTERAPIA"],
    atendimentos: "4",
    creditosRemarcacao: "2",
    permiteParcelamentoEstendido: "",
    valorAVistaMensal: "400,00",
    valorAVistaTrimestral: "1.080,00",
    valorAte3xTrimestral: "1.188,00",
    salas: JSON.stringify([{ salaId: "sala-1", descricao: "Uso de equipamentos" }]),
    ...overrides,
  };
}

describe("planoSchema", () => {
  it("aceita um input válido e converte os valores para número", () => {
    const parsed = planoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.atendimentos).toBe(4);
      expect(parsed.data.valorAVistaMensal).toBe(400);
      expect(parsed.data.valorAte3xTrimestral).toBe(1188);
    }
  });

  it("exige número de atendimentos válido", () => {
    const parsed = planoSchema.safeParse(baseInput({ atendimentos: "0" }));
    expect(parsed.success).toBe(false);
  });

  it("aceita creditosRemarcacao zero mas rejeita negativo/vazio", () => {
    expect(planoSchema.safeParse(baseInput({ creditosRemarcacao: "0" })).success).toBe(
      true,
    );
    expect(planoSchema.safeParse(baseInput({ creditosRemarcacao: "-1" })).success).toBe(
      false,
    );
    expect(planoSchema.safeParse(baseInput({ creditosRemarcacao: "" })).success).toBe(
      false,
    );
  });

  it("exige ao menos um tipo selecionado", () => {
    const parsed = planoSchema.safeParse(baseInput({ tipos: [] }));
    expect(parsed.success).toBe(false);
  });

  it("aceita múltiplos tipos simultâneos", () => {
    const parsed = planoSchema.safeParse(
      baseInput({ tipos: ["FISIOTERAPIA", "EDUCACAO_FISICA"] }),
    );
    expect(parsed.success).toBe(true);
  });

  it("exige os 3 valores do plano", () => {
    const parsed = planoSchema.safeParse(baseInput({ valorAte3xTrimestral: "" }));
    expect(parsed.success).toBe(false);
  });

  it("rejeita valor inválido", () => {
    const parsed = planoSchema.safeParse(baseInput({ valorAVistaMensal: "abc" }));
    expect(parsed.success).toBe(false);
  });

  it("rejeita valor zero ou negativo", () => {
    const parsed = planoSchema.safeParse(baseInput({ valorAVistaMensal: "0" }));
    expect(parsed.success).toBe(false);
  });

  it("não tem mais os campos taxaCartao/opcoes", () => {
    const parsed = planoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("taxaCartao");
      expect(parsed.data).not.toHaveProperty("opcoes");
    }
  });

  it("faz parse das salas do JSON, com descrição opcional", () => {
    const parsed = planoSchema.safeParse(
      baseInput({
        salas: JSON.stringify([
          { salaId: "sala-1", descricao: "Usa a Sala 2 para uso de equipamentos" },
          { salaId: "sala-2" },
        ]),
      }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.salas).toEqual([
        { salaId: "sala-1", descricao: "Usa a Sala 2 para uso de equipamentos" },
        { salaId: "sala-2" },
      ]);
    }
  });

  it("exige ao menos uma sala configurada", () => {
    expect(planoSchema.safeParse(baseInput({ salas: "[]" })).success).toBe(false);
    expect(planoSchema.safeParse(baseInput({ salas: "" })).success).toBe(false);
  });

  it("rejeita JSON de salas malformado", () => {
    expect(planoSchema.safeParse(baseInput({ salas: "{not json" })).success).toBe(false);
  });

  it("permiteParcelamentoEstendido é false por padrão quando ausente/vazio", () => {
    const parsed = planoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.permiteParcelamentoEstendido).toBe(false);
  });

  it("aceita permiteParcelamentoEstendido marcado só no plano híbrido", () => {
    const parsed = planoSchema.safeParse(
      baseInput({
        tipos: ["FISIOTERAPIA", "EDUCACAO_FISICA"],
        permiteParcelamentoEstendido: "on",
      }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.permiteParcelamentoEstendido).toBe(true);
  });

  it("rejeita permiteParcelamentoEstendido marcado num plano não-híbrido", () => {
    expect(
      planoSchema.safeParse(
        baseInput({ tipos: ["FISIOTERAPIA"], permiteParcelamentoEstendido: "on" }),
      ).success,
    ).toBe(false);
    expect(
      planoSchema.safeParse(
        baseInput({ tipos: ["EDUCACAO_FISICA"], permiteParcelamentoEstendido: "on" }),
      ).success,
    ).toBe(false);
  });
});
