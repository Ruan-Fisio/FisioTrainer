import { describe, expect, it } from "vitest";
import {
  ehRegistroNaoEncontrado,
  exameAlteradoDesde,
  parseCarregadoEm,
} from "./exame-edicao-concorrente";

const carregado = new Date("2026-10-28T11:58:28.123Z");

describe("parseCarregadoEm", () => {
  it("lê o ISO preservando milissegundos", () => {
    expect(parseCarregadoEm(carregado.toISOString())?.getTime()).toBe(carregado.getTime());
  });

  it("ausente, vazio ou inválido vira null", () => {
    expect(parseCarregadoEm(null)).toBeNull();
    expect(parseCarregadoEm("")).toBeNull();
    expect(parseCarregadoEm("ontem")).toBeNull();
  });
});

describe("exameAlteradoDesde", () => {
  it("libera quando ninguém salvou desde que a tela foi aberta", () => {
    expect(exameAlteradoDesde({ versaoAtual: true, updatedAt: new Date(carregado) }, carregado)).toBe(false);
  });

  it("barra quando outra pessoa salvou depois (updatedAt mudou, mesmo 1ms)", () => {
    const depois = new Date(carregado.getTime() + 1);
    expect(exameAlteradoDesde({ versaoAtual: true, updatedAt: depois }, carregado)).toBe(true);
  });

  it("barra versão arquivada e exame inexistente, com ou sem carregadoEm", () => {
    expect(exameAlteradoDesde({ versaoAtual: false, updatedAt: carregado }, carregado)).toBe(true);
    expect(exameAlteradoDesde({ versaoAtual: false, updatedAt: carregado }, null)).toBe(true);
    expect(exameAlteradoDesde(null, carregado)).toBe(true);
  });

  it("sem carregadoEm (form antigo) só checa a versão", () => {
    expect(exameAlteradoDesde({ versaoAtual: true, updatedAt: carregado }, null)).toBe(false);
  });
});

describe("ehRegistroNaoEncontrado", () => {
  it("reconhece só o P2025", () => {
    expect(ehRegistroNaoEncontrado({ code: "P2025" })).toBe(true);
    expect(ehRegistroNaoEncontrado({ code: "P2002" })).toBe(false);
    expect(ehRegistroNaoEncontrado(new Error("x"))).toBe(false);
    expect(ehRegistroNaoEncontrado(null)).toBe(false);
  });
});
