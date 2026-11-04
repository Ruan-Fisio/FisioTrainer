import fs from "node:fs/promises";
import path from "node:path";
import { deleteObject, getObjectBytes, presignGet, putObject } from "@/lib/r2";

/**
 * Onde ficam os PDFs assinados: no R2, ou numa pasta local quando `CONTRATOS_STORAGE_DIR`
 * estiver definida (só a suíte E2E define, para nunca gravar no bucket real). Em produção
 * essa variável é ignorada.
 */
function pastaLocal() {
  return process.env.NODE_ENV === "production"
    ? null
    : (process.env.CONTRATOS_STORAGE_DIR ?? null);
}

function caminhoLocal(pasta: string, chave: string) {
  return path.join(pasta, chave.replaceAll("/", "_"));
}

export async function salvarPdfContrato(chave: string, bytes: Uint8Array) {
  const pasta = pastaLocal();
  if (pasta) {
    await fs.mkdir(pasta, { recursive: true });
    await fs.writeFile(caminhoLocal(pasta, chave), bytes);
    return;
  }
  await putObject(chave, bytes, "application/pdf");
}

export async function removerPdfContrato(chave: string) {
  const pasta = pastaLocal();
  if (pasta) await fs.rm(caminhoLocal(pasta, chave), { force: true });
  else await deleteObject(chave);
}

export async function lerPdfContrato(chave: string): Promise<Uint8Array> {
  const pasta = pastaLocal();
  return pasta ? fs.readFile(caminhoLocal(pasta, chave)) : getObjectBytes(chave);
}

/** Link direto de download (funciona no navegador interno do WhatsApp, onde blob costuma falhar). */
export async function urlDownloadContrato(chave: string, nome: string) {
  const pasta = pastaLocal();
  if (pasta) {
    const bytes = await fs.readFile(caminhoLocal(pasta, chave));
    return `data:application/pdf;base64,${bytes.toString("base64")}`;
  }
  return presignGet(chave, { nome });
}
