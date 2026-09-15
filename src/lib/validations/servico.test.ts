import { describe, expect, it } from "vitest";
import { servicoSchema } from "./servico";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    nome: "Psicologia",
    ativo: true,
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
});
