import { describe, expect, it } from "vitest";
import { celularValido, mascararCelular, soDigitos } from "./telefone";

describe("mascararCelular", () => {
  it("aplica a máscara progressivamente", () => {
    expect(mascararCelular("")).toBe("");
    expect(mascararCelular("1")).toBe("(1");
    expect(mascararCelular("119")).toBe("(11) 9");
    expect(mascararCelular("1191234")).toBe("(11) 91234");
    expect(mascararCelular("11912345")).toBe("(11) 91234-5");
    expect(mascararCelular("11912345678")).toBe("(11) 91234-5678");
  });
  it("ignora não-dígitos e limita a 11 dígitos", () => {
    expect(mascararCelular("(11) 91234-5678999")).toBe("(11) 91234-5678");
    expect(mascararCelular("abc")).toBe("");
  });
});

describe("celularValido", () => {
  it("aceita com ou sem máscara", () => {
    expect(celularValido("(11) 91234-5678")).toBe(true);
    expect(celularValido("11912345678")).toBe(true);
  });
  it("rejeita DDD inválido, falta do 9 e tamanho errado", () => {
    expect(celularValido("(01) 91234-5678")).toBe(false);
    expect(celularValido("(11) 81234-5678")).toBe(false);
    expect(celularValido("(11) 1234-5678")).toBe(false);
    expect(celularValido("119123456789")).toBe(false);
    expect(celularValido("")).toBe(false);
  });
});

describe("soDigitos", () => {
  it("remove tudo que não é dígito", () => {
    expect(soDigitos("(11) 9-12")).toBe("11912");
  });
});
