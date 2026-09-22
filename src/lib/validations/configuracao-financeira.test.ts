import { describe, expect, it } from "vitest";
import { configuracaoTaxaSchema } from "./configuracao-financeira";

describe("configuracaoTaxaSchema", () => {
  it("aceita um percentual válido e converte vírgula para número", () => {
    const parsed = configuracaoTaxaSchema.safeParse({ percentual: "2,3" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.percentual).toBe(2.3);
  });

  it("aceita 0%", () => {
    expect(configuracaoTaxaSchema.safeParse({ percentual: "0" }).success).toBe(true);
  });

  it("aceita 100%", () => {
    expect(configuracaoTaxaSchema.safeParse({ percentual: "100" }).success).toBe(true);
  });

  it("rejeita percentual negativo", () => {
    expect(configuracaoTaxaSchema.safeParse({ percentual: "-1" }).success).toBe(false);
  });

  it("rejeita percentual acima de 100", () => {
    expect(configuracaoTaxaSchema.safeParse({ percentual: "100,01" }).success).toBe(false);
  });

  it("rejeita valor não numérico", () => {
    expect(configuracaoTaxaSchema.safeParse({ percentual: "abc" }).success).toBe(false);
  });

  it("rejeita entrada vazia", () => {
    expect(configuracaoTaxaSchema.safeParse({ percentual: "" }).success).toBe(false);
  });
});
