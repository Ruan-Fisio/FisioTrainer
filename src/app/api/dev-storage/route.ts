import { lerUrlStorageDev, storageDevAtivo } from "@/lib/storage-dev";
import { devGet, devPut } from "@/lib/storage-dev-db";

/**
 * Substituto local das URLs assinadas do R2 (só fora de produção; ver
 * `src/lib/storage-dev.ts`). A URL carrega um HMAC com AUTH_SECRET, então só
 * funciona para o que o servidor autorizou, igual a uma URL pré-assinada.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function naoEncontrado() {
  return new Response("Não encontrado", { status: 404 });
}

export async function GET(req: Request) {
  if (!storageDevAtivo()) return naoEncontrado();
  const p = lerUrlStorageDev(new URL(req.url).searchParams, "get");
  if (!p) return new Response("URL inválida ou expirada", { status: 403 });

  const arquivo = await devGet(p.chave);
  if (!arquivo) return naoEncontrado();

  const nome = encodeURIComponent(p.nome ?? "arquivo");
  return new Response(Buffer.from(arquivo.bytes), {
    headers: {
      "Content-Type": arquivo.mime || "application/octet-stream",
      "Content-Length": String(arquivo.bytes.byteLength),
      "Content-Disposition": p.inline ? "inline" : `attachment; filename*=UTF-8''${nome}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function PUT(req: Request) {
  if (!storageDevAtivo()) return naoEncontrado();
  const p = lerUrlStorageDev(new URL(req.url).searchParams, "put");
  if (!p) return new Response("URL inválida ou expirada", { status: 403 });

  const corpo = new Uint8Array(await req.arrayBuffer());
  if (p.tamanho != null && corpo.byteLength !== p.tamanho) {
    return new Response("Tamanho diferente do autorizado", { status: 400 });
  }
  const mime = p.mime ?? req.headers.get("content-type") ?? "application/octet-stream";
  await devPut(p.chave, corpo, mime);
  return new Response(null, { status: 200 });
}
