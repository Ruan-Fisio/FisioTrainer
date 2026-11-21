/**
 * Configuração da análise postural por IA (ver `specs/003-analise-postural-ia.md`).
 * Lógica pura sobre variáveis de ambiente.
 */

type Env = Record<string, string | undefined>;

/** Classificação da vista (rápido e barato). */
export const MODELO_IA_PADRAO = "gemini-3.8-flash";
/**
 * Localização dos pontos: no teste com o esquema do protocolo (specs/004) o 3.1 Pro
 * achou os 12 pontos com ~1% de erro; os Flash devolviam só o vértice.
 */
export const MODELO_PONTOS_IA_PADRAO = "gemini-3.1-pro-preview";
export const LIMITE_DIARIO_IA_PADRAO = 30;

/** Resposta fixa sem rede (E2E e dev sem chave). Nunca em produção. */
export function modoFakeIa(env: Env = process.env): boolean {
  return env.NODE_ENV !== "production" && env.ANALISE_IA_FAKE === "1";
}

/** O botão "Analisar com IA" só aparece com chave configurada (ou em modo fake). */
export function iaAnaliseDisponivel(env: Env = process.env): boolean {
  return modoFakeIa(env) || !!env.GEMINI_API_KEY?.trim();
}

export function modeloIa(env: Env = process.env): string {
  return env.GEMINI_MODEL?.trim() || MODELO_IA_PADRAO;
}

export function modeloPontosIa(env: Env = process.env): string {
  return env.GEMINI_MODEL_PONTOS?.trim() || MODELO_PONTOS_IA_PADRAO;
}

/** Análises por usuário por dia (Brasília); valor inválido cai no padrão. */
export function limiteDiarioIa(env: Env = process.env): number {
  const n = Number(env.IA_ANALISE_LIMITE_DIARIO);
  return Number.isInteger(n) && n > 0 ? n : LIMITE_DIARIO_IA_PADRAO;
}
