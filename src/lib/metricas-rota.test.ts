import { describe, expect, it } from "vitest";
import { normalizarRota } from "./metricas-rota";

const CUID = "clx1abcd0000xyz1234567890";
const TOKEN = "Zm9vYmFyLXRva2VuX2Jhc2U2NHVybA-_";

describe("normalizarRota — clínica", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard/despesas", "/dashboard/despesas"],
    ["/dashboard/despesas/nova", "/dashboard/despesas/nova"],
    [`/dashboard/despesas/${CUID}`, "/dashboard/despesas/[id]"],
    ["/pacientes", "/pacientes"],
    ["/pacientes/novo", "/pacientes/novo"],
    [`/pacientes/${CUID}`, "/pacientes/[id]"],
    [`/pacientes/${CUID}/planos`, "/pacientes/[id]/planos"],
    [`/pacientes/${CUID}/planos/${CUID}/editar`, "/pacientes/[id]/planos/[id]/editar"],
    [`/pacientes/${CUID}/exames/${CUID}/comparar`, "/pacientes/[id]/exames/[id]/comparar"],
    [`/pacientes/${CUID}/cobrancas/novo`, "/pacientes/[id]/cobrancas/novo"],
    ["/biblioteca-movimento", "/biblioteca-movimento"],
    ["/biblioteca-movimento/goniometria", "/biblioteca-movimento/goniometria"],
    [`/biblioteca-movimento/goniometria/${CUID}`, "/biblioteca-movimento/goniometria/[id]"],
    ["/biblioteca/categorias/novo", "/biblioteca/categorias/novo"],
    [`/biblioteca/exercicios/${CUID}/editar`, "/biblioteca/exercicios/[id]/editar"],
    ["/agenda", "/agenda"],
    ["/cobrancas", "/cobrancas"],
    ["/configuracoes", "/configuracoes"],
    ["/contratos", "/contratos"],
    ["/curadoria", "/curadoria"],
    ["/evolucoes", "/evolucoes"],
    ["/exames/novo", "/exames/novo"],
    [`/exames/${CUID}/editar`, "/exames/[id]/editar"],
    ["/logs", "/logs"],
    ["/planos", "/planos"],
    ["/servicos", "/servicos"],
    ["/treinos", "/treinos"],
    ["/usuarios", "/usuarios"],
  ])("%s → %s", (entrada, chave) => {
    expect(normalizarRota(entrada)).toEqual({ area: "CLINICA", chave });
  });

  it("descarta query string e hash", () => {
    expect(normalizarRota(`/pacientes/${CUID}?aba=planos#topo`)).toEqual({
      area: "CLINICA",
      chave: "/pacientes/[id]",
    });
  });

  it("segmento estático longo não vira [id]", () => {
    expect(normalizarRota("/biblioteca-movimento")?.chave).toBe("/biblioteca-movimento");
  });
});

describe("normalizarRota — portal e pré-cadastro", () => {
  it("token do portal nunca aparece na chave", () => {
    const r = normalizarRota(`/compartilhado/paciente/${TOKEN}/financeiro/${CUID}`);
    expect(r).toEqual({ area: "PORTAL", chave: "/compartilhado/paciente/[id]/financeiro/[id]" });
    expect(r?.chave).not.toContain(TOKEN);
  });

  it.each([
    [`/compartilhado/paciente/${TOKEN}`, "/compartilhado/paciente/[id]"],
    [`/compartilhado/paciente/${TOKEN}/documentos/${CUID}/pdf`, "/compartilhado/paciente/[id]/documentos/[id]/pdf"],
    [`/compartilhado/paciente/${TOKEN}/exames/${CUID}`, "/compartilhado/paciente/[id]/exames/[id]"],
    [`/compartilhado/contrato/${TOKEN}`, "/compartilhado/contrato/[id]"],
    [`/compartilhado/exercicios/${CUID}`, "/compartilhado/exercicios/[id]"],
    [`/compartilhado/treinos/${CUID}`, "/compartilhado/treinos/[id]"],
  ])("%s → %s", (entrada, chave) => {
    expect(normalizarRota(entrada)).toEqual({ area: "PORTAL", chave });
  });

  it("pré-cadastro", () => {
    expect(normalizarRota("/pre-cadastro")).toEqual({ area: "PRE_CADASTRO", chave: "/pre-cadastro" });
    expect(normalizarRota("/pre-cadastro/")).toEqual({ area: "PRE_CADASTRO", chave: "/pre-cadastro" });
    expect(normalizarRota("/pre-cadastro/lixo")).toBeNull();
  });

  it("/compartilhado sozinho é ignorado", () => {
    expect(normalizarRota("/compartilhado")).toBeNull();
  });
});

describe("normalizarRota — ignorados", () => {
  it.each([
    "/",
    "/api/metricas/acesso",
    "/login",
    "/metrics",
    "/qualquer-coisa",
    "/_next/static/x.js",
    "sem-barra",
    "",
  ])("%j → null", (entrada) => {
    expect(normalizarRota(entrada)).toBeNull();
  });

  it("entrada não-string, longa demais ou profunda demais", () => {
    expect(normalizarRota(undefined)).toBeNull();
    expect(normalizarRota(42)).toBeNull();
    expect(normalizarRota("/pacientes/" + "a".repeat(300))).toBeNull();
    expect(normalizarRota("/pacientes/" + Array(10).fill("x").join("/"))).toBeNull();
  });
});
