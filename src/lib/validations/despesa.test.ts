import { describe, expect, it } from "vitest";
import { toDateInputValue } from "@/lib/format";
import { despesaSchema, parseValorMonetario } from "./despesa";

const base = {
  descricao: "Conta de luz",
  categoria: "ENERGIA",
  valor: "250,00",
  data: "2026-10-31",
  status: "PENDENTE",
};

describe("parseValorMonetario", () => {
  it.each([
    ["250", 250],
    ["250,5", 250.5],
    ["250,50", 250.5],
    ["250.50", 250.5],
    ["1.500", 1500],
    ["1.234,56", 1234.56],
    ["12.345.678,90", 12345678.9],
    ["R$ 89,90", 89.9],
  ])("%s → %d", (entrada, esperado) => {
    expect(parseValorMonetario(entrada)).toBe(esperado);
  });

  it.each(["", "abc", "1,2,3", "-5", "1.50.00", "10,999"])("rejeita %j", (entrada) => {
    expect(parseValorMonetario(entrada)).toBeNaN();
  });
});

describe("despesaSchema", () => {
  it("grava a data ao meio-dia de Brasília, sem trocar o dia", () => {
    const r = despesaSchema.parse(base);
    expect(r.data.toISOString()).toBe("2026-10-31T15:00:00.000Z");
    expect(toDateInputValue(r.data)).toBe("2026-10-31");
  });

  it("opcionais vazios viram null", () => {
    const r = despesaSchema.parse({ ...base, fornecedor: " ", numeroDocumento: "", observacao: "" });
    expect(r).toMatchObject({ fornecedor: null, numeroDocumento: null, observacao: null });
  });

  it("valor zero ou acima do limite do banco é inválido", () => {
    expect(despesaSchema.safeParse({ ...base, valor: "0" }).success).toBe(false);
    expect(despesaSchema.safeParse({ ...base, valor: "100.000.000,00" }).success).toBe(false);
  });

  it("rejeita data inexistente e categoria desconhecida", () => {
    expect(despesaSchema.safeParse({ ...base, data: "2026-02-31" }).success).toBe(false);
    expect(despesaSchema.safeParse({ ...base, data: "" }).success).toBe(false);
    expect(despesaSchema.safeParse({ ...base, categoria: "XPTO" }).success).toBe(false);
  });

  it("paga exige data de pagamento, que não pode ser futura", () => {
    const paga = { ...base, status: "PAGO" };
    expect(despesaSchema.safeParse(paga).success).toBe(false);
    expect(despesaSchema.safeParse({ ...paga, pagoEm: "2100-01-01" }).success).toBe(false);
    const r = despesaSchema.parse({ ...paga, pagoEm: "2026-11-01" });
    expect(r.pagoEm?.toISOString()).toBe("2026-11-01T15:00:00.000Z");
  });

  it("pendente descarta a data de pagamento enviada", () => {
    expect(despesaSchema.parse({ ...base, pagoEm: "2026-11-01" }).pagoEm).toBeNull();
  });
});
