import { describe, expect, it } from "vitest";
import { planoAtribuicaoSchema } from "./plano-atribuicao";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    planoId: "plano-1",
    formaPagamento: "A_VISTA",
    periodicidade: "MENSAL",
    vencimentos: ["2026-09-01"],
    ...overrides,
  };
}

describe("planoAtribuicaoSchema", () => {
  it("aceita um input válido e converte vencimentos em Date", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.vencimentos).toHaveLength(1);
      expect(parsed.data.vencimentos[0]).toBeInstanceOf(Date);
      expect(parsed.data.formaPagamento).toBe("A_VISTA");
    }
  });

  it("exige planoId", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput({ planoId: "" }));
    expect(parsed.success).toBe(false);
  });

  it("exige formaPagamento válido", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ formaPagamento: "OUTRA" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("exige ao menos uma data de vencimento", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput({ vencimentos: [] }));
    expect(parsed.success).toBe(false);
  });

  it("aceita até 3 parcelas para formas 'até 3x'", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({
        formaPagamento: "ATE_3X_CARTAO",
        vencimentos: ["2026-09-01", "2026-10-01", "2026-11-01"],
      }),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejeita mais de 3 parcelas para formas 'até 3x'", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({
        formaPagamento: "ATE_3X_NF",
        vencimentos: ["2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01"],
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("rejeita mais de 1 parcela para formas 'à vista'", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({
        formaPagamento: "A_VISTA_NF",
        vencimentos: ["2026-09-01", "2026-10-01"],
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("aceita sem desconto por padrão", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.descontoTipo).toBe("NENHUM");
      expect(parsed.data.descontoValor).toBe(0);
    }
  });

  it("exige descontoValor quando descontoTipo é VALOR", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "VALOR", descontoValor: "" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("aceita descontoValor válido para VALOR", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "VALOR", descontoValor: "50" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.descontoValor).toBe(50);
  });

  it("rejeita percentual maior que 100", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "PERCENTUAL", descontoValor: "150" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("exige valorAlvoParcela quando descontoTipo é ALVO_PARCELA", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "ALVO_PARCELA", valorAlvoParcela: "" }),
    );
    expect(parsed.success).toBe(false);
  });

  it("aceita valorAlvoParcela válido para ALVO_PARCELA", () => {
    const parsed = planoAtribuicaoSchema.safeParse(
      baseInput({ descontoTipo: "ALVO_PARCELA", valorAlvoParcela: "90" }),
    );
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.valorAlvoParcela).toBe(90);
  });
});
