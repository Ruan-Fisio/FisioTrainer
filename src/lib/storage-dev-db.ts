import { prisma } from "@/lib/prisma";

/**
 * Operações do armazenamento de dev sobre a tabela `ArquivoDev` (bytes em base64).
 * Espelham as funções de `r2.ts`, que delega para cá quando `storageDevAtivo()`.
 */

export async function devPut(chave: string, corpo: Uint8Array, mime: string) {
  const dados = {
    mime,
    tamanho: corpo.byteLength,
    conteudo: Buffer.from(corpo).toString("base64"),
  };
  await prisma.arquivoDev.upsert({
    where: { chave },
    create: { chave, ...dados },
    update: dados,
  });
}

export async function devGet(chave: string) {
  const a = await prisma.arquivoDev.findUnique({ where: { chave } });
  if (!a) return null;
  return { mime: a.mime, bytes: new Uint8Array(Buffer.from(a.conteudo, "base64")) };
}

export async function devGetBytes(chave: string) {
  const a = await devGet(chave);
  if (!a) throw new Error(`Objeto inexistente no armazenamento de dev: ${chave}`);
  return a.bytes;
}

export async function devHead(chave: string) {
  const a = await prisma.arquivoDev.findUnique({
    where: { chave },
    select: { tamanho: true, mime: true },
  });
  if (!a) throw new Error(`Objeto inexistente no armazenamento de dev: ${chave}`);
  return { tamanho: a.tamanho, mime: a.mime };
}

export async function devCopy(origem: string, destino: string) {
  const a = await prisma.arquivoDev.findUnique({ where: { chave: origem } });
  if (!a) throw new Error(`Objeto inexistente no armazenamento de dev: ${origem}`);
  const dados = { mime: a.mime, tamanho: a.tamanho, conteudo: a.conteudo };
  await prisma.arquivoDev.upsert({
    where: { chave: destino },
    create: { chave: destino, ...dados },
    update: dados,
  });
}

export async function devDelete(chaves: string[]) {
  if (chaves.length === 0) return;
  await prisma.arquivoDev.deleteMany({ where: { chave: { in: chaves } } });
}

export async function devDeletePrefix(prefixo: string) {
  await prisma.arquivoDev.deleteMany({ where: { chave: { startsWith: prefixo } } });
}
