import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cliente fino do Cloudflare R2 (API S3-compatível). Regras de chave/validação
 * ficam em `storage-keys.ts` (puro e testado).
 * Env: R2_ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_ID, R2_BUCKET (default "fisiotrainer").
 */

let client: S3Client | null = null;

export function r2Bucket() {
  return process.env.R2_BUCKET ?? "fisiotrainer";
}

function r2() {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECRET_ACCESS_ID;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Armazenamento de imagens não configurado (R2_ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_ID).",
    );
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    // O SDK novo embute um checksum CRC32 (de corpo vazio) nas URLs assinadas,
    // que não serve para upload direto do navegador — só calcula quando exigido.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

/**
 * URL de envio. Com `tamanho`, o Content-Length entra na assinatura: o R2
 * recusa um PUT de tamanho diferente (importante no formulário público).
 */
export function presignPut(
  chave: string,
  mime: string,
  opts: { tamanho?: number; expiraEm?: number } = {},
) {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: chave,
      ContentType: mime,
      ContentLength: opts.tamanho,
    }),
    { expiresIn: opts.expiraEm ?? 300 },
  );
}

/**
 * URL de leitura. Imagens abrem inline; qualquer outro arquivo é forçado a
 * baixar (Content-Disposition: attachment), nunca executado no navegador.
 */
export function presignGet(
  chave: string,
  opts: { nome?: string; inline?: boolean; expiraEm?: number } = {},
) {
  const { nome, inline = false, expiraEm = 900 } = opts;
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: r2Bucket(),
      Key: chave,
      ResponseContentDisposition: inline
        ? undefined
        : `attachment; filename*=UTF-8''${encodeURIComponent(nome ?? "arquivo")}`,
    }),
    { expiresIn: expiraEm },
  );
}

/** Metadados reais do objeto (não confia no que o navegador declarou). */
export async function headObject(chave: string) {
  const res = await r2().send(
    new HeadObjectCommand({ Bucket: r2Bucket(), Key: chave }),
  );
  return { tamanho: res.ContentLength ?? 0, mime: res.ContentType ?? "" };
}

export async function copyObject(origem: string, destino: string) {
  await r2().send(
    new CopyObjectCommand({
      Bucket: r2Bucket(),
      Key: destino,
      CopySource: `${r2Bucket()}/${origem
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
    }),
  );
}

export async function deleteObject(chave: string) {
  await r2().send(
    new DeleteObjectCommand({ Bucket: r2Bucket(), Key: chave }),
  );
}

export async function deleteObjects(chaves: string[]) {
  for (let i = 0; i < chaves.length; i += 1000) {
    await r2().send(
      new DeleteObjectsCommand({
        Bucket: r2Bucket(),
        Delete: {
          Objects: chaves.slice(i, i + 1000).map((Key) => ({ Key })),
        },
      }),
    );
  }
}

export async function deletePrefix(prefixo: string) {
  let token: string | undefined;
  do {
    const res = await r2().send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        Prefix: prefixo,
        ContinuationToken: token,
      }),
    );
    const chaves = (res.Contents ?? []).flatMap((o) => (o.Key ? [o.Key] : []));
    if (chaves.length > 0) await deleteObjects(chaves);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
}
