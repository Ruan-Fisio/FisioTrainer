import { describe, expect, it } from "vitest";
import { sanitizarValorAuditoria } from "@/lib/audit";

describe("sanitizarValorAuditoria", () => {
  it("não serializa binários byte a byte (Bytes do Prisma 7 é Uint8Array)", () => {
    const png = new Uint8Array(300 * 1024);
    expect(sanitizarValorAuditoria(png)).toBe("[binário]");
    expect(sanitizarValorAuditoria(Buffer.from([1, 2, 3]))).toBe("[binário]");
    expect(sanitizarValorAuditoria(new ArrayBuffer(8))).toBe("[binário]");
  });

  it("marca o binário dentro do payload e mantém os demais campos", () => {
    const r = sanitizarValorAuditoria({ id: "a1", userId: "u1", png: new Uint8Array([137, 80]) });
    expect(r).toEqual({ id: "a1", userId: "u1", png: "[binário]" });
  });

  it("continua ocultando campos sigilosos", () => {
    expect(sanitizarValorAuditoria({ password: "x", nome: "Ana" })).toEqual({
      password: "[oculto]",
      nome: "Ana",
    });
  });
});
