import { describe, expect, it } from "vitest";
import { planoAtribuicaoSchema } from "./plano-atribuicao";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    planoOpcaoId: "opcao-1",
    cartao: "false",
    vencimentos: ["2026-09-01", "2026-10-01"],
    ...overrides,
  };
}

describe("planoAtribuicaoSchema", () => {
  it("aceita um input válido e converte vencimentos em Date", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.vencimentos).toHaveLength(2);
      expect(parsed.data.vencimentos[0]).toBeInstanceOf(Date);
      expect(parsed.data.cartao).toBe(false);
    }
  });

  it("converte cartao 'true' para booleano true", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput({ cartao: "true" }));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.cartao).toBe(true);
    }
  });

  it("exige ao menos uma data de vencimento", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput({ vencimentos: [] }));
    expect(parsed.success).toBe(false);
  });

  it("aceita uma única parcela", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ vencimentos: ["2026-09-01"] }),
    );
    expect(parsed.success).toBe(true);
  });

  it("exige planoOpcaoId", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput({ planoOpcaoId: "" }));
    expect(parsed.success).toBe(false);
  });
});
