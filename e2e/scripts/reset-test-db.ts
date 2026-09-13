/**
 * Prepara o banco de teste da suíte E2E **do zero, a cada rodada**: derruba o banco se já
 * existir, recria vazio, aplica todas as migrations e roda o seed padrão (`prisma/seed.ts`).
 * Isolamento total entre execuções é o que garante que specs de busca/paginação/nome-único
 * não vejam sobra de uma rodada anterior. Chamado pelo `globalSetup` do Playwright
 * (`e2e/global-setup.ts`) antes de qualquer spec rodar — nunca toca no banco de dev
 * (`fisiotrainer`), só em `TEST_DATABASE_URL` (`e2e/test-db.ts`).
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { TEST_DATABASE_URL, nomeBancoDeTeste } from "../test-db";

async function recriarBancoDoZero(url: string) {
  const nomeBanco = nomeBancoDeTeste(url);
  const urlManutencao = new URL(url);
  urlManutencao.pathname = "/postgres";

  // Nome vem só de `TEST_DATABASE_URL` (config local, não input de usuário) — mas
  // identificador de banco não aceita parâmetro bind, então valida o formato antes de
  // interpolar, e barra explicitamente o nome do banco de dev como rede de segurança.
  if (!/^[a-zA-Z0-9_]+$/.test(nomeBanco)) {
    throw new Error(`Nome de banco de teste inválido: "${nomeBanco}"`);
  }
  if (nomeBanco === "fisiotrainer") {
    throw new Error(
      'TEST_DATABASE_URL não pode apontar pro banco de dev ("fisiotrainer") — ' +
        "este script derruba o banco inteiro a cada rodada.",
    );
  }

  const client = new Client({ connectionString: urlManutencao.toString() });
  await client.connect();
  try {
    // Precisa encerrar conexões ativas antes de derrubar (ex. um dev server E2E de uma
    // rodada anterior que não foi finalizado corretamente).
    await client.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [nomeBanco],
    );
    await client.query(`DROP DATABASE IF EXISTS "${nomeBanco}"`);
    await client.query(`CREATE DATABASE "${nomeBanco}"`);
    console.log(`[e2e] Banco "${nomeBanco}" recriado do zero.`);
  } finally {
    await client.end();
  }
}

function rodar(comando: string, args: string[]) {
  execFileSync(comando, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
    },
  });
}

async function main() {
  console.log(`[e2e] Preparando banco de teste: ${TEST_DATABASE_URL}`);
  await recriarBancoDoZero(TEST_DATABASE_URL);

  console.log("[e2e] Aplicando migrations...");
  rodar("npx", ["prisma", "migrate", "deploy"]);

  console.log("[e2e] Rodando seed...");
  rodar("npx", ["tsx", "prisma/seed.ts"]);

  console.log("[e2e] Banco de teste pronto.");
}

main().catch((err) => {
  console.error("[e2e] Falha ao preparar o banco de teste:", err);
  process.exit(1);
});
