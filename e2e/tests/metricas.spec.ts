import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "../test-db";
import { ADMIN } from "../fixtures/usuarios";
import { criarPaciente } from "../fixtures/pacientes";
import { criarPlano } from "../fixtures/planos";
import { atribuirPlano } from "../fixtures/plano-atribuicoes";
import { nomeUnico } from "../fixtures/nomes";

/** Conta eventos brutos com os filtros dados (SQL parametrizado). */
async function contar(db: Client, where: string, params: unknown[] = []) {
  const r = await db.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM "EventoUso" WHERE ${where}`, params);
  return Number(r.rows[0].n);
}

test.describe("métricas de uso (/metrics)", () => {
  let db: Client;

  test.beforeAll(async () => {
    db = new Client({ connectionString: TEST_DATABASE_URL });
    await db.connect();
  });

  test.afterAll(async () => {
    await db.end();
  });

  test("registra page views da clínica com a rota-padrão, sem IDs (CA1)", async ({ page }) => {
    const paciente = await criarPaciente(page);
    const antes = await contar(db, `"area" = 'CLINICA' AND "chave" = '/pacientes/[id]'`);

    await page.goto(`/pacientes/${paciente.id}`);

    await expect
      .poll(() => contar(db, `"area" = 'CLINICA' AND "chave" = '/pacientes/[id]'`))
      .toBeGreaterThan(antes);
    expect(await contar(db, `"chave" LIKE '%' || $1 || '%'`, [paciente.id])).toBe(0);
    // evento da clínica carrega o usuário
    expect(
      await contar(db, `"area" = 'CLINICA' AND "tipo" = 'TELA' AND "usuarioId" IS NULL`),
    ).toBe(0);
  });

  test.describe("sem sessão", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("pré-cadastro e portal gravam a rota sem token e sem usuário (CA2)", async ({ page }) => {
      // Portal com token VÁLIDO (criado direto no banco): token inválido cai no 404 raiz,
      // fora do layout do portal, e não é contado.
      const token = `tok${randomUUID().replace(/-/g, "")}`;
      const pacienteId = randomUUID();
      await db.query(`INSERT INTO "Paciente" (id, nome, "updatedAt") VALUES ($1, $2, now())`, [
        pacienteId,
        nomeUnico("Paciente métrica"),
      ]);
      await db.query(
        `INSERT INTO "AcessoCompartilhadoPaciente" (id, token, "pacienteId") VALUES ($1, $2, $3)`,
        [`e2e-${randomUUID()}`, token, pacienteId],
      );
      const antesPre = await contar(db, `"area" = 'PRE_CADASTRO' AND "chave" = '/pre-cadastro'`);
      const antesPortal = await contar(
        db,
        `"area" = 'PORTAL' AND "chave" = '/compartilhado/paciente/[id]'`,
      );

      await page.goto("/pre-cadastro");
      await expect
        .poll(() => contar(db, `"area" = 'PRE_CADASTRO' AND "chave" = '/pre-cadastro'`))
        .toBeGreaterThan(antesPre);

      // o token nunca vira parte da chave: só a rota-padrão é gravada
      await page.goto(`/compartilhado/paciente/${token}`);
      await expect
        .poll(() =>
          contar(db, `"area" = 'PORTAL' AND "chave" = '/compartilhado/paciente/[id]'`),
        )
        .toBeGreaterThan(antesPortal);

      expect(await contar(db, `"chave" LIKE '%' || $1 || '%'`, [token])).toBe(0);
      expect(
        await contar(db, `"area" IN ('PORTAL','PRE_CADASTRO') AND "usuarioId" IS NOT NULL`),
      ).toBe(0);
    });

    test("beacon da clínica sem sessão é descartado; body grande também (RN6)", async ({ request }) => {
      const antes = await contar(db, `"area" = 'CLINICA' AND "usuarioId" IS NULL`);

      const r1 = await request.post("/api/metricas/acesso", { data: { p: "/pacientes" } });
      expect(r1.status()).toBe(204);
      const r2 = await request.post("/api/metricas/acesso", {
        data: { p: "/pre-cadastro", lixo: "x".repeat(5000) },
      });
      expect(r2.status()).toBe(204);
      const r3 = await request.post("/api/metricas/acesso", { data: "não é json" });
      expect(r3.status()).toBe(204);

      await new Promise((r) => setTimeout(r, 500));
      expect(await contar(db, `"area" = 'CLINICA' AND "usuarioId" IS NULL`)).toBe(antes);
      expect(antes).toBe(0);
    });

    test("login bem-sucedido registra o evento `login` (CA3)", async ({ page }) => {
      const total = async () => {
        const r = await db.query<{ n: string }>(
          `SELECT COALESCE(SUM("total"), 0)::text AS n FROM "UsoDiario"
           WHERE "area" = 'CLINICA' AND "tipo" = 'ACAO' AND "chave" = 'login'`,
        );
        return Number(r.rows[0].n);
      };
      const antes = await total();

      await page.goto("/login");
      await page.getByLabel("E-mail").fill(ADMIN.email);
      await page.getByLabel("Senha").fill(ADMIN.senha);
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).toHaveURL(/\/dashboard/);

      await expect.poll(total).toBeGreaterThan(antes);
      expect(
        await contar(db, `"area" = 'CLINICA' AND "tipo" = 'ACAO' AND "chave" = 'login' AND "usuarioId" IS NOT NULL`),
      ).toBeGreaterThan(0);
    });

    test("sem sessão, /metrics redireciona para o login (CA6)", async ({ page }) => {
      await page.goto("/metrics");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test("painel lista rotas, troca período via URL e avisa em 365 dias (CA4a, CA5)", async ({ page }) => {
    // Linha com total gigante para entrar no top 10 mesmo com o tráfego das outras specs.
    const chave = `/e2e-metricas/${nomeUnico("rota")}`;
    await db.query(
      `INSERT INTO "UsoDiario" ("id","dia","area","tipo","chave","total")
       VALUES ($1, (now() AT TIME ZONE 'America/Sao_Paulo')::date, 'CLINICA', 'TELA', $2, 100000000)`,
      [randomUUID(), chave],
    );

    await page.goto("/metrics");
    await expect(page.getByRole("heading", { name: "Métricas de uso" })).toBeVisible();
    await expect(page.getByText(chave)).toBeVisible();
    await expect(page.getByText("Page views por dia")).toBeVisible();
    await expect(page.getByRole("button", { name: "30 dias" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/cobrem apenas os últimos 90 dias/)).toHaveCount(0);

    await page.getByRole("button", { name: "7 dias" }).click();
    await expect(page).toHaveURL(/dias=7/);
    await expect(page.getByRole("button", { name: "7 dias" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "365 dias" }).click();
    await expect(page).toHaveURL(/dias=365/);
    await expect(page.getByText(/cobrem apenas os últimos 90 dias/)).toBeVisible();

    // valor inválido na URL cai no padrão
    await page.goto("/metrics?dias=15");
    await expect(page.getByRole("button", { name: "30 dias" })).toHaveAttribute("aria-pressed", "true");
  });

  test("planos mais usados mostra o plano atribuído (CA4e)", async ({ page }) => {
    const paciente = await criarPaciente(page);
    const plano = await criarPlano(page);
    await atribuirPlano(page, paciente.id, plano.id);

    await page.goto("/metrics");
    const linha = page.getByRole("row", { name: new RegExp(plano.nome) });
    await expect(linha).toBeVisible();
    // 1 atribuição no período e 1 ativa hoje
    await expect(linha.getByRole("cell").nth(1)).toHaveText("1");
    await expect(linha.getByRole("cell").nth(2)).toHaveText("1");
  });

  test("ações-chave mostram logins e módulos do AuditLog (CA4d)", async ({ page }) => {
    await criarPaciente(page);
    await page.goto("/metrics");
    await expect(page.getByText("Ações-chave", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Paciente", exact: true })).toBeVisible();
  });

  test("purga eventos brutos com mais de 90 dias e mantém o agregado (CA8)", async ({ page }) => {
    const chave = `/e2e-purga/${nomeUnico("p")}`;
    await db.query(
      `INSERT INTO "EventoUso" ("id","criadoEm","area","tipo","chave")
       VALUES ($1, now() - interval '100 days', 'CLINICA', 'TELA', $2)`,
      [randomUUID(), chave],
    );
    await db.query(
      `INSERT INTO "UsoDiario" ("id","dia","area","tipo","chave","total")
       VALUES ($1, (now() - interval '100 days')::date, 'CLINICA', 'TELA', $2, 7)`,
      [randomUUID(), chave],
    );

    await page.goto("/metrics");

    await expect.poll(() => contar(db, `"chave" = $1`, [chave])).toBe(0);
    const agg = await db.query(`SELECT "total" FROM "UsoDiario" WHERE "chave" = $1`, [chave]);
    expect(agg.rows).toHaveLength(1);
    expect(agg.rows[0].total).toBe(7);
  });

  test("não há link para /metrics no menu (CA7)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Meus compromissos")).toBeVisible();
    await expect(page.locator('a[href="/metrics"]')).toHaveCount(0);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");
    const menu = page.getByRole("button", { name: /menu/i }).first();
    if (await menu.isVisible()) await menu.click();
    await expect(page.locator('a[href="/metrics"]')).toHaveCount(0);
  });

  test("em 375px os blocos empilham sem scroll horizontal (CA10)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/metrics");
    await expect(page.getByRole("heading", { name: "Métricas de uso" })).toBeVisible();
    await expect(page.getByText("Planos mais usados", { exact: true })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
