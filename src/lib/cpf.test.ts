import { describe, expect, it } from "vitest";
import { cpfConfere, mascararCpf } from "./cpf";

describe("mascararCpf", () => {
  it("aplica a máscara progressivamente", () => {
    expect(mascararCpf("123")).toBe("123");
    expect(mascararCpf("1234")).toBe("123.4");
    expect(mascararCpf("1234567")).toBe("123.456.7");
    expect(mascararCpf("1234567890")).toBe("123.456.789-0");
    expect(mascararCpf("12345678901")).toBe("123.456.789-01");
  });

  it("ignora o que passa de 11 dígitos e o que não é dígito", () => {
    expect(mascararCpf("123.456.789-0199")).toBe("123.456.789-01");
    expect(mascararCpf(null)).toBe("");
  });
});

describe("cpfConfere", () => {
  it("compara só os dígitos, com ou sem máscara", () => {
    expect(cpfConfere("123.456.789-01", "12345678901")).toBe(true);
    expect(cpfConfere("12345678901", "123.456.789-01")).toBe(true);
  });

  it("recusa CPF diferente", () => {
    expect(cpfConfere("12345678900", "12345678901")).toBe(false);
  });

  it("cadastro vazio nunca confere, mesmo com digitação vazia", () => {
    expect(cpfConfere("", null)).toBe(false);
    expect(cpfConfere("", "")).toBe(false);
    expect(cpfConfere("", "---")).toBe(false);
  });
});
