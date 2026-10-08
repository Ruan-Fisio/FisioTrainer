/**
 * Prepara o bucket do R2 (cria se não existir) e aplica o CORS necessário
 * para o upload direto do navegador via URL assinada.
 *
 *   npx tsx scripts/r2-setup.ts [origem1,origem2]
 *
 * Origens padrão: http://localhost:3000 e http://localhost:3100.
 * Em produção, passe a URL do site (ex.: https://app.exemplo.com).
 */
import "dotenv/config";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

async function main() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.ACCESS_KEY_ID;
  const secretAccessKey = process.env.SECRET_ACCESS_ID;
  const bucket = process.env.R2_BUCKET ?? "fisiotrainer";
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Defina R2_ACCOUNT_ID, ACCESS_KEY_ID e SECRET_ACCESS_ID no .env.");
  }
  const origens = (process.argv[2] ?? "http://localhost:3000,http://localhost:3100").split(",");

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Bucket "${bucket}" já existe.`);
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Bucket "${bucket}" criado.`);
  }

  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origens,
            AllowedMethods: ["PUT", "GET"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
  // Uploads temporários (feitos antes de salvar o exame) que forem abandonados.
  await s3.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "expirar-uploads-temporarios",
            Status: "Enabled",
            Filter: { Prefix: "tmp/" },
            Expiration: { Days: 1 },
          },
        ],
      },
    }),
  );
  console.log("Expiração de tmp/ em 1 dia aplicada.");
  console.log(`CORS aplicado para: ${origens.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
