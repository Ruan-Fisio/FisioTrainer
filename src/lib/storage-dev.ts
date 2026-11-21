import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Armazenamento de arquivos só para desenvolvimento: em vez do R2, os bytes ficam
 * em base64 na tabela `ArquivoDev` e são servidos por `/api/dev-storage`.
 * Lógica pura (ativação + "URL assinada" local); o acesso ao banco fica em
 * `storage-dev-db.ts`. Nunca ativa com NODE_ENV=production.
 */

type Env = Record<string, string | undefined>;

export const ROTA_STORAGE_DEV = "/api/dev-storage";

/**
 * Ativo fora de produção quando `STORAGE_DEV=db` ou quando o R2 não está
 * configurado (credenciais vazias). `STORAGE_DEV=r2` força o R2 mesmo em dev.
 */
export function storageDevAtivo(env: Env = process.env): boolean {
  if (env.NODE_ENV === "production") return false;
  if (env.STORAGE_DEV === "db") return true;
  if (env.STORAGE_DEV === "r2") return false;
  return !env.R2_ACCOUNT_ID || !env.ACCESS_KEY_ID || !env.SECRET_ACCESS_ID;
}

export type OperacaoDev = "get" | "put";

export type ParamsDev = {
  op: OperacaoDev;
  chave: string;
  /** Expiração em epoch ms. */
  exp: number;
  /** put: tamanho exato exigido (opcional). */
  tamanho?: number;
  /** put: Content-Type gravado. */
  mime?: string;
  /** get: abre no navegador em vez de baixar. */
  inline?: boolean;
  /** get: nome do arquivo no download. */
  nome?: string;
};

function segredo(env: Env) {
  const s = env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET ausente: necessário para o armazenamento de dev.");
  return s;
}

function payload(p: ParamsDev) {
  return [
    p.op,
    p.chave,
    p.exp,
    p.tamanho ?? "",
    p.mime ?? "",
    p.inline ? "1" : "",
    p.nome ?? "",
  ].join("\n");
}

function assinatura(p: ParamsDev, env: Env) {
  return createHmac("sha256", segredo(env)).update(payload(p)).digest("base64url");
}

/** URL relativa (mesma origem do app) que imita uma URL assinada do R2. */
export function urlStorageDev(p: ParamsDev, env: Env = process.env): string {
  const q = new URLSearchParams({ op: p.op, k: p.chave, e: String(p.exp) });
  if (p.tamanho != null) q.set("s", String(p.tamanho));
  if (p.mime) q.set("m", p.mime);
  if (p.inline) q.set("i", "1");
  if (p.nome) q.set("n", p.nome);
  q.set("t", assinatura(p, env));
  return `${ROTA_STORAGE_DEV}?${q.toString()}`;
}

/** Valida a URL recebida pela rota; `null` se adulterada, expirada ou de outra operação. */
export function lerUrlStorageDev(
  busca: URLSearchParams,
  op: OperacaoDev,
  agora = Date.now(),
  env: Env = process.env,
): ParamsDev | null {
  const chave = busca.get("k");
  const exp = Number(busca.get("e"));
  const token = busca.get("t");
  if (busca.get("op") !== op || !chave || !token || !Number.isFinite(exp)) return null;
  if (exp < agora) return null;
  const s = busca.get("s");
  const p: ParamsDev = {
    op,
    chave,
    exp,
    tamanho: s == null ? undefined : Number(s),
    mime: busca.get("m") ?? undefined,
    inline: busca.get("i") === "1",
    nome: busca.get("n") ?? undefined,
  };
  const esperado = Buffer.from(assinatura(p, env));
  const recebido = Buffer.from(token);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) {
    return null;
  }
  return p;
}
