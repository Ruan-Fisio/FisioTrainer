import { describe, expect, it } from "vitest";
import {
  MULTIPLA_ESCOLHA_DELIMITER,
  parseSelecionadas,
  serializeSelecionadas,
  toggleSelecionada,
} from "./multipla-escolha";

// Regressão: opção "Positivo = Reprodução da dor, irradiação ou fraqueza"
// (com vírgula no texto) não marcava no radio de "Testes Especiais".
const OPCAO_COM_VIRGULA =
  "Positivo = Reprodução da dor, irradiação ou fraqueza";
const OPCAO_SEM_VIRGULA = "Negativo = Nenhum efeito ou dor";

describe("parseSelecionadas", () => {
  it("mantém intacta uma opção com vírgula quando serializada no formato novo", () => {
    const valor = serializeSelecionadas([OPCAO_COM_VIRGULA]);
    expect(parseSelecionadas(valor)).toEqual([OPCAO_COM_VIRGULA]);
  });

  it("separa múltiplas opções pelo delimitador dedicado", () => {
    const valor = serializeSelecionadas([OPCAO_COM_VIRGULA, OPCAO_SEM_VIRGULA]);
    expect(parseSelecionadas(valor)).toEqual([
      OPCAO_COM_VIRGULA,
      OPCAO_SEM_VIRGULA,
    ]);
  });

  it("retorna lista vazia para valor vazio", () => {
    expect(parseSelecionadas("")).toEqual([]);
  });

  it("faz fallback para vírgula em dados legados sem o delimitador novo", () => {
    expect(parseSelecionadas("A,B,C")).toEqual(["A", "B", "C"]);
  });
});

describe("serializeSelecionadas", () => {
  it("junta as opções com o delimitador dedicado, não vírgula", () => {
    const valor = serializeSelecionadas([OPCAO_COM_VIRGULA, OPCAO_SEM_VIRGULA]);
    expect(valor).toBe(
      `${MULTIPLA_ESCOLHA_DELIMITER}${OPCAO_COM_VIRGULA}${MULTIPLA_ESCOLHA_DELIMITER}${OPCAO_SEM_VIRGULA}`,
    );
  });

  it("roundtrip: serializar e depois parsear devolve a lista original", () => {
    const original = [OPCAO_COM_VIRGULA, OPCAO_SEM_VIRGULA, "Terceira, opção"];
    expect(parseSelecionadas(serializeSelecionadas(original))).toEqual(
      original,
    );
  });
});

describe("toggleSelecionada", () => {
  it("adiciona uma opção com vírgula a um valor vazio", () => {
    const valor = toggleSelecionada("", OPCAO_COM_VIRGULA);
    expect(parseSelecionadas(valor)).toEqual([OPCAO_COM_VIRGULA]);
  });

  it("remove a opção quando ela já está selecionada, mesmo contendo vírgula", () => {
    const valor = serializeSelecionadas([OPCAO_COM_VIRGULA, OPCAO_SEM_VIRGULA]);
    const resultado = toggleSelecionada(valor, OPCAO_COM_VIRGULA);
    expect(parseSelecionadas(resultado)).toEqual([OPCAO_SEM_VIRGULA]);
  });

  it("adiciona uma segunda opção sem corromper a primeira (com vírgula)", () => {
    const comPrimeira = toggleSelecionada("", OPCAO_COM_VIRGULA);
    const comAmbas = toggleSelecionada(comPrimeira, OPCAO_SEM_VIRGULA);
    expect(parseSelecionadas(comAmbas)).toEqual([
      OPCAO_COM_VIRGULA,
      OPCAO_SEM_VIRGULA,
    ]);
  });
});
