import { describe, expect, it } from "vitest";
import {
  LIMITE_DIARIO_IA_PADRAO,
  MODELO_IA_PADRAO,
  iaAnaliseDisponivel,
  limiteDiarioIa,
  MODELO_PONTOS_IA_PADRAO,
  modeloIa,
  modeloPontosIa,
  modoFakeIa,
} from "./ia-config";

describe("ia-config", () => {
  it("disponível só com chave ou em modo fake", () => {
    expect(iaAnaliseDisponivel({})).toBe(false);
    expect(iaAnaliseDisponivel({ GEMINI_API_KEY: "  " })).toBe(false);
    expect(iaAnaliseDisponivel({ GEMINI_API_KEY: "abc" })).toBe(true);
    expect(iaAnaliseDisponivel({ ANALISE_IA_FAKE: "1" })).toBe(true);
  });

  it("modo fake nunca liga em produção", () => {
    expect(modoFakeIa({ ANALISE_IA_FAKE: "1", NODE_ENV: "production" })).toBe(false);
    expect(iaAnaliseDisponivel({ ANALISE_IA_FAKE: "1", NODE_ENV: "production" })).toBe(false);
  });

  it("modelo configurável com padrão", () => {
    expect(modeloIa({})).toBe(MODELO_IA_PADRAO);
    expect(modeloIa({ GEMINI_MODEL: "gemini-x" })).toBe("gemini-x");
    expect(modeloPontosIa({})).toBe(MODELO_PONTOS_IA_PADRAO);
    expect(modeloPontosIa({ GEMINI_MODEL_PONTOS: "gemini-pro-x" })).toBe("gemini-pro-x");
  });

  it("limite diário inválido cai no padrão", () => {
    expect(limiteDiarioIa({})).toBe(LIMITE_DIARIO_IA_PADRAO);
    expect(limiteDiarioIa({ IA_ANALISE_LIMITE_DIARIO: "abc" })).toBe(LIMITE_DIARIO_IA_PADRAO);
    expect(limiteDiarioIa({ IA_ANALISE_LIMITE_DIARIO: "0" })).toBe(LIMITE_DIARIO_IA_PADRAO);
    expect(limiteDiarioIa({ IA_ANALISE_LIMITE_DIARIO: "5" })).toBe(5);
  });
});
