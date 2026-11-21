import { describe, expect, it } from "vitest";
import { lerUrlStorageDev, storageDevAtivo, urlStorageDev, type ParamsDev } from "./storage-dev";

const env = { AUTH_SECRET: "segredo-de-teste" };
const R2 = { R2_ACCOUNT_ID: "a", ACCESS_KEY_ID: "b", SECRET_ACCESS_ID: "c" };

function busca(url: string) {
  return new URL(url, "http://localhost").searchParams;
}

describe("storageDevAtivo", () => {
  it("nunca ativa em produção", () => {
    expect(storageDevAtivo({ NODE_ENV: "production", STORAGE_DEV: "db" })).toBe(false);
    expect(storageDevAtivo({ NODE_ENV: "production" })).toBe(false);
  });

  it("em dev, ativa sem credenciais do R2 (vazias contam como ausentes)", () => {
    expect(storageDevAtivo({ NODE_ENV: "development" })).toBe(true);
    expect(storageDevAtivo({ NODE_ENV: "development", ...R2, ACCESS_KEY_ID: "" })).toBe(true);
    expect(storageDevAtivo({ NODE_ENV: "development", ...R2 })).toBe(false);
  });

  it("STORAGE_DEV força o modo", () => {
    expect(storageDevAtivo({ NODE_ENV: "development", ...R2, STORAGE_DEV: "db" })).toBe(true);
    expect(storageDevAtivo({ NODE_ENV: "development", STORAGE_DEV: "r2" })).toBe(false);
  });
});

describe("URL assinada de dev", () => {
  const agora = 1_000_000;
  const put: ParamsDev = {
    op: "put",
    chave: "pacientes/p1/foto 1.jpg",
    exp: agora + 60_000,
    tamanho: 123,
    mime: "image/jpeg",
  };

  it("ida e volta preserva os parâmetros", () => {
    const url = urlStorageDev(put, env);
    expect(url.startsWith("/api/dev-storage?")).toBe(true);
    expect(lerUrlStorageDev(busca(url), "put", agora, env)).toEqual({
      ...put,
      inline: false,
      nome: undefined,
    });
  });

  it("get com inline e nome", () => {
    const get: ParamsDev = { op: "get", chave: "x/y.pdf", exp: agora + 1, inline: true, nome: "Relatório.pdf" };
    const r = lerUrlStorageDev(busca(urlStorageDev(get, env)), "get", agora, env);
    expect(r).toMatchObject({ chave: "x/y.pdf", inline: true, nome: "Relatório.pdf" });
  });

  it("recusa URL expirada, de outra operação ou adulterada", () => {
    const url = urlStorageDev(put, env);
    expect(lerUrlStorageDev(busca(url), "put", agora + 120_000, env)).toBeNull();
    expect(lerUrlStorageDev(busca(url), "get", agora, env)).toBeNull();
    const q = busca(url);
    q.set("s", "999999");
    expect(lerUrlStorageDev(q, "put", agora, env)).toBeNull();
    const q2 = busca(url);
    q2.set("k", "pacientes/outro/foto.jpg");
    expect(lerUrlStorageDev(q2, "put", agora, env)).toBeNull();
  });

  it("recusa assinatura de outro segredo", () => {
    const url = urlStorageDev(put, { AUTH_SECRET: "outro" });
    expect(lerUrlStorageDev(busca(url), "put", agora, env)).toBeNull();
  });
});
