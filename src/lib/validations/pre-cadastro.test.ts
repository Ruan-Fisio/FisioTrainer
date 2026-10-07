import { describe, expect, it } from "vitest";
import { preCadastroSchema, rejeitarPreCadastroSchema } from "./pre-cadastro";

const base = {
  nome: "Maria",
  sobrenome: "Silva",
  celular: "(11) 91234-5678",
  queixaPrincipal: "Dor no joelho direito ao subir escadas",
};

describe("preCadastroSchema", () => {
  it("aceita e normaliza o celular para dígitos", () => {
    const r = preCadastroSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.celular).toBe("11912345678");
  });
  it("rejeita celular inválido", () => {
    expect(preCadastroSchema.safeParse({ ...base, celular: "123" }).success).toBe(false);
  });
  it("limita a queixa a 2000 palavras", () => {
    const ok = Array(2000).fill("dor").join(" ");
    const demais = Array(2001).fill("dor").join(" ");
    expect(preCadastroSchema.safeParse({ ...base, queixaPrincipal: ok }).success).toBe(true);
    expect(preCadastroSchema.safeParse({ ...base, queixaPrincipal: demais }).success).toBe(false);
  });
  it("exige nome, sobrenome e queixa", () => {
    expect(preCadastroSchema.safeParse({ ...base, nome: "" }).success).toBe(false);
    expect(preCadastroSchema.safeParse({ ...base, sobrenome: " " }).success).toBe(false);
    expect(preCadastroSchema.safeParse({ ...base, queixaPrincipal: "dor" }).success).toBe(false);
  });
});

describe("rejeitarPreCadastroSchema", () => {
  it("motivo é opcional e limitado a 500", () => {
    expect(rejeitarPreCadastroSchema.safeParse({}).success).toBe(true);
    expect(rejeitarPreCadastroSchema.safeParse({ motivo: "x".repeat(501) }).success).toBe(false);
  });
});
