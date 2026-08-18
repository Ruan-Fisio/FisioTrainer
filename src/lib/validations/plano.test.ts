import { describe, expect, it } from "vitest";
import { planoSchema } from "./plano";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    nome: "Mensal Fisioterapia",
    descricao: "",
    tipos: ["FISIOTERAPIA"],
    opcoes: [{ atendimentos: "4", valor: "400,00" }],
    taxaCartao: "3,5",
    ...overrides,
  };
}

describe("planoSchema", () => {
  it("aceita um input válido e converte taxaCartao para número", () => {
    const parsed = planoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.taxaCartao).toBe(3.5);
    }
  });

  it("trata taxaCartao vazia como 0", () => {
    const parsed = planoSchema.safeParse(baseInput({ taxaCartao: "" }));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.taxaCartao).toBe(0);
    }
  });

  it("rejeita taxaCartao negativa", () => {
    const parsed = planoSchema.safeParse(baseInput({ taxaCartao: "-1" }));
    expect(parsed.success).toBe(false);
  });

  it("rejeita taxaCartao acima de 100", () => {
    const parsed = planoSchema.safeParse(baseInput({ taxaCartao: "101" }));
    expect(parsed.success).toBe(false);
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

  it("exige ao menos uma opção", () => {
    const parsed = planoSchema.safeParse(baseInput({ opcoes: [] }));
    expect(parsed.success).toBe(false);
  });

  it("rejeita opção com número de atendimentos inválido", () => {
    const parsed = planoSchema.safeParse(
      baseInput({ opcoes: [{ atendimentos: "0", valor: "100,00" }] }),
    );
    expect(parsed.success).toBe(false);
  });

  it("não tem mais os campos formaPagamento/periodicidade/numeroParcelas/ativo", () => {
    const parsed = planoSchema.safeParse(baseInput());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("formaPagamento");
      expect(parsed.data).not.toHaveProperty("periodicidade");
      expect(parsed.data).not.toHaveProperty("numeroParcelas");
      expect(parsed.data).not.toHaveProperty("ativo");
    }
  });
});
