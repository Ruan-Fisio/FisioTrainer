import { describe, expect, it } from "vitest";
import { planoAtribuicaoSchema } from "./plano-atribuicao";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    planoOpcaoId: "opcao-1",
    cartao: "false",
    notaFiscal: "false",
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

  it("converte notaFiscal 'true' para booleano true", () => {
    const parsed = planoAtribuicaoSchema.safeParse(baseInput({ notaFiscal: "true" }));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.notaFiscal).toBe(true);
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
