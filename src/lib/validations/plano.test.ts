import { describe, expect, it } from "vitest";
import { planoSchema } from "./plano";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    nome: "Mensal Fisioterapia",
    descricao: "",
    tipos: ["FISIOTERAPIA"],
    atendimentos: "4",
    valorAVistaMensal: "400,00",
    valorAVistaTrimestral: "1.080,00",
    valorAVistaNfMensal: "428,00",
    valorAVistaNfTrimestral: "1.155,60",
    valorAte3xCartaoMensal: "440,00",
    valorAte3xCartaoTrimestral: "1.188,00",
    valorAte3xNfMensal: "428,00",
    valorAte3xNfTrimestral: "1.155,60",
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
      expect(parsed.data.valorAte3xCartaoTrimestral).toBe(1188);
    }
  });

  it("exige número de atendimentos válido", () => {
    const parsed = planoSchema.safeParse(baseInput({ atendimentos: "0" }));
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

  it("exige todos os 8 valores de forma de pagamento", () => {
    const parsed = planoSchema.safeParse(baseInput({ valorAte3xCartaoMensal: "" }));
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
});
