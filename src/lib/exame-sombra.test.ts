import { describe, expect, it } from "vitest";
import { serializeSelecionadas } from "./multipla-escolha";
import {
  montarValoresSombra,
  valorPreenchido,
  type ValorHistorico,
} from "./exame-sombra";

describe("montarValoresSombra", () => {
  it("retorna lista vazia sem quebrar quando não há execução anterior (primeira avaliação)", () => {
    expect(montarValoresSombra([], [{ id: "col-1" }])).toEqual([]);
  });

  it("mantém valores de colunas que ainda existem no exame atual", () => {
    const anteriores: ValorHistorico[] = [
      { colunaId: "col-1", valor: "10", linha: 0 },
      { colunaId: "col-2", valor: "Sim", linha: 0 },
    ];
    const resultado = montarValoresSombra(anteriores, [
      { id: "col-1" },
      { id: "col-2" },
    ]);
    expect(resultado).toEqual(anteriores);
  });

  it("filtra fora colunas que não existem mais no exame atual (coluna removida/renomeada em nova versão)", () => {
    const anteriores: ValorHistorico[] = [
      { colunaId: "col-antiga", valor: "10", linha: 0 },
      { colunaId: "col-1", valor: "20", linha: 0 },
    ];
    const resultado = montarValoresSombra(anteriores, [{ id: "col-1" }]);
    expect(resultado).toEqual([{ colunaId: "col-1", valor: "20", linha: 0 }]);
  });

  it("preserva intacto o valor de goniometria, incluindo o grau atingido", () => {
    const valorGoniometria = JSON.stringify([
      { nome: "Flexão de ombro", lado: "Direito", grauAlcancado: "120" },
    ]);
    const anteriores: ValorHistorico[] = [
      { colunaId: "col-goniometria", valor: valorGoniometria, linha: 0 },
    ];
    const resultado = montarValoresSombra(anteriores, [
      { id: "col-goniometria" },
    ]);
    expect(resultado[0].valor).toBe(valorGoniometria);
  });

  it("preserva intacto valor de múltipla escolha com vírgula/delimitador no texto da opção", () => {
    const valor = serializeSelecionadas([
      "Positivo = Reprodução da dor, irradiação ou fraqueza",
      "Negativo = Nenhum efeito ou dor",
    ]);
    const anteriores: ValorHistorico[] = [
      { colunaId: "col-multipla", valor, linha: 0 },
    ];
    const resultado = montarValoresSombra(anteriores, [
      { id: "col-multipla" },
    ]);
    expect(resultado[0].valor).toBe(valor);
  });

  it("preserva múltiplas linhas de um campo repetível", () => {
    const anteriores: ValorHistorico[] = [
      { colunaId: "col-1", valor: "Linha 0", linha: 0 },
      { colunaId: "col-1", valor: "Linha 1", linha: 1 },
    ];
    const resultado = montarValoresSombra(anteriores, [{ id: "col-1" }]);
    expect(resultado).toEqual(anteriores);
  });
});

describe("valorPreenchido", () => {
  it("string vazia não conta como preenchida", () => {
    expect(valorPreenchido("")).toBe(false);
  });

  it("goniometria sem nenhum movimento selecionado (\"[]\") não conta como preenchida", () => {
    expect(valorPreenchido("[]")).toBe(false);
  });

  it("qualquer outro valor conta como preenchido, incluindo \"0\" (número zero é um valor real)", () => {
    expect(valorPreenchido("0")).toBe(true);
    expect(valorPreenchido("Não")).toBe(true);
    expect(valorPreenchido(JSON.stringify([{ nome: "Flexão", lado: "Direito", grauAlcancado: "90" }]))).toBe(true);
  });
});
