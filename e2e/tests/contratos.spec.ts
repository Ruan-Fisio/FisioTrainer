import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "../test-db";
import { atribuirPlano } from "../fixtures/plano-atribuicoes";
import { criarPlano } from "../fixtures/planos";
import { nomeUnico } from "../fixtures/nomes";

const SEM_LOGIN = { storageState: { cookies: [], origins: [] } };

/** CPF único por execução: `Paciente.cpf` é único no banco. */
function cpfUnico() {
  return String(Date.now() + Math.floor(Math.random() * 1000)).slice(-11).padStart(11, "1");
}

async function comBanco<T>(fn: (db: Client) => Promise<T>) {
  const db = new Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

async function tokenDoContrato(pacienteId: string) {
  return comBanco(async (db) => {
    const r = await db.query<{ token: string }>(
      `SELECT token FROM "Contrato" WHERE "pacienteId" = $1 AND status = 'PENDENTE'`,
      [pacienteId],
    );
    return r.rows[0]?.token;
  });
}

/** O seed não preenche os dados fiscais do admin, necessários para identificar a contratada. */
test.beforeAll(async () => {
  await comBanco((db) =>
    db.query(
      `UPDATE "User" SET "cpfCnpj" = '00.000.000/0001-00', "razaoSocial" = 'Clinica Teste LTDA', endereco = 'Av. Teste, 1' WHERE email = 'admin@admin.com'`,
    ),
  );
});

async function criarPacienteComCpf(page: Page, cpf: string | null) {
  const nome = nomeUnico("Paciente Contrato");
  await page.goto("/pacientes/novo");
  await page.getByLabel("Nome").fill(nome);
  if (cpf) await page.getByLabel("CPF").fill(cpf);
  await page.getByRole("button", { name: "Criar paciente" }).click();
  await page.waitForURL(/\/pacientes$/);
  const id = await comBanco(async (db) => {
    const r = await db.query<{ id: string }>(`SELECT id FROM "Paciente" WHERE nome = $1`, [nome]);
    return r.rows[0].id;
  });
  return { nome, id };
}

async function desenharAssinatura(page: Page) {
  const pad = page.getByTestId("assinatura-pad");
  await pad.scrollIntoViewIfNeeded();
  const caixa = (await pad.boundingBox())!;
  await page.mouse.move(caixa.x + 30, caixa.y + 30);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(caixa.x + 30 + i * 20, caixa.y + 30 + (i % 2) * 40);
  }
  await page.mouse.up();
}

test.describe("Contratos", () => {
  test("atribuir plano gera o contrato, e o paciente assina e baixa o PDF", async ({
    page,
    browser,
  }) => {
    const cpf = cpfUnico();
    const paciente = await criarPacienteComCpf(page, cpf);
    const plano = await criarPlano(page);
    await atribuirPlano(page, paciente.id, plano.id);

    await expect(page.getByText("Aguardando assinatura")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar link" })).toBeVisible();

    const token = await tokenDoContrato(paciente.id);
    expect(token).toBeTruthy();

    const contexto = await browser.newContext({ ...SEM_LOGIN, viewport: { width: 375, height: 800 } });
    const publica = await contexto.newPage();
    await publica.goto(`/compartilhado/contrato/${token}`);

    // Nada do contrato aparece antes de confirmar o CPF, senão ele serviria de cola.
    await expect(publica.getByText(plano.nome)).toBeVisible();
    await expect(publica.getByText("CLÁUSULA 1")).toHaveCount(0);

    await publica.getByLabel("CPF").fill("00000000000");
    await publica.getByRole("button", { name: "Abrir contrato" }).click();
    await expect(publica.locator('p[role="alert"]')).toContainText("não confere");

    await publica.getByLabel("CPF").fill(cpf);
    await publica.getByRole("button", { name: "Abrir contrato" }).click();
    await expect(publica.getByText("CLÁUSULA 1 - DO OBJETO")).toBeVisible();
    await expect(publica.getByText("Clinica Teste LTDA")).toBeVisible();

    // Só libera com assinatura e aceite.
    const assinar = publica.getByRole("button", { name: "Assinar contrato" });
    await expect(assinar).toBeDisabled();
    await desenharAssinatura(publica);
    await expect(assinar).toBeDisabled();
    await publica.getByRole("checkbox").click();
    await assinar.click();

    await expect(publica.getByRole("heading", { name: "Contrato assinado" })).toBeVisible({
      timeout: 20_000,
    });

    const download = publica.waitForEvent("download");
    await publica.getByRole("link", { name: "Baixar contrato em PDF" }).click();
    expect((await download).suggestedFilename()).toMatch(/^Contrato_CT-\d+\.pdf$/);
    await contexto.close();

    const salvo = await comBanco(async (db) => {
      const r = await db.query(
        `SELECT status, "assinanteCpf", "pdfHash", "conteudoHash", conteudo FROM "Contrato" WHERE token = $1`,
        [token],
      );
      return r.rows[0];
    });
    expect(salvo.status).toBe("ASSINADO");
    expect(salvo.pdfHash).toMatch(/^[0-9a-f]{64}$/);
    expect(salvo.conteudoHash).toMatch(/^[0-9a-f]{64}$/);
    expect(salvo.conteudo).toContain(paciente.nome);

    // A equipe vê o contrato assinado na tela do paciente e abre o PDF.
    await page.goto(`/pacientes/${paciente.id}?tab=planos`);
    await expect(page.getByText("Assinado", { exact: true })).toBeVisible();
    const pdf = await page.request.get(
      (await page.getByRole("link", { name: "Ver PDF" }).getAttribute("href"))!,
    );
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  test("paciente sem CPF no cadastro não consegue abrir para assinar", async ({ page, browser }) => {
    const paciente = await criarPacienteComCpf(page, null);
    const plano = await criarPlano(page);
    await atribuirPlano(page, paciente.id, plano.id);
    await expect(page.getByText("Cadastre o CPF do paciente")).toBeVisible();

    const token = await tokenDoContrato(paciente.id);
    const contexto = await browser.newContext(SEM_LOGIN);
    const publica = await contexto.newPage();
    await publica.goto(`/compartilhado/contrato/${token}`);
    await expect(publica.getByText("Seu CPF ainda não está no cadastro")).toBeVisible();
    await expect(publica.getByLabel("CPF")).toHaveCount(0);
    await contexto.close();
  });

  test("cinco CPFs errados bloqueiam o link, até para o CPF certo", async ({ page, browser }) => {
    const cpf = cpfUnico();
    const paciente = await criarPacienteComCpf(page, cpf);
    const plano = await criarPlano(page);
    await atribuirPlano(page, paciente.id, plano.id);

    const token = await tokenDoContrato(paciente.id);
    const contexto = await browser.newContext(SEM_LOGIN);
    const publica = await contexto.newPage();
    await publica.goto(`/compartilhado/contrato/${token}`);

    const alerta = publica.locator('p[role="alert"]');
    for (let i = 0; i < 5; i++) {
      await publica.getByLabel("CPF").fill(`0000000000${i}`);
      await publica.getByRole("button", { name: "Abrir contrato" }).click();
      await expect(alerta).toContainText("não confere");
      await expect(publica.getByRole("button", { name: "Abrir contrato" })).toBeEnabled();
      await comBanco(async (db) => {
        const r = await db.query(`SELECT "tentativasCpf", "bloqueadoAte" FROM "Contrato" WHERE token = $1`, [token]);
        expect(r.rows[0].tentativasCpf === i + 1 || r.rows[0].bloqueadoAte !== null).toBe(true);
      });
    }

    await publica.getByLabel("CPF").fill(cpf);
    await publica.getByRole("button", { name: "Abrir contrato" }).click();
    await expect(alerta).toContainText("Muitas tentativas");
    await expect(publica.getByText("CLÁUSULA 1")).toHaveCount(0);
    await contexto.close();
  });

  test("cancelar o plano invalida o link pendente", async ({ page, browser }) => {
    const paciente = await criarPacienteComCpf(page, cpfUnico());
    const plano = await criarPlano(page);
    await atribuirPlano(page, paciente.id, plano.id);
    const token = await tokenDoContrato(paciente.id);

    await page.getByRole("button", { name: "Cancelar plano" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Cancelar plano/ }).click();
    await expect(page.getByText("Plano cancelado").first()).toBeVisible();

    const contexto = await browser.newContext(SEM_LOGIN);
    const publica = await contexto.newPage();
    await publica.goto(`/compartilhado/contrato/${token}`);
    await expect(publica.getByRole("heading", { name: "Contrato indisponível" })).toBeVisible();
    await contexto.close();
  });

  test("o modelo pode ser editado, recusa variável errada e aparece no contrato", async ({
    page,
    browser,
  }) => {
    const marca = nomeUnico("Clausula Especial");
    await page.goto("/contratos?tab=modelo");

    const texto = page.getByLabel("Texto do contrato");
    const original = await texto.inputValue();
    expect(original).toContain("{{plano.nome}}");

    await texto.fill(`${original}\n\n{{plano.nomee}}`);
    await page.getByRole("button", { name: "Salvar nova versão" }).click();
    await expect(page.getByText("Variável não reconhecida").first()).toBeVisible();

    await texto.fill(`${original}\n\n## ${marca}`);
    await page.getByRole("button", { name: "Pré-visualizar" }).click();
    await expect(page.getByTestId("previa-contrato")).toContainText("Plano Performance");
    await expect(page.getByTestId("previa-contrato")).toContainText(marca);

    await page.getByRole("button", { name: "Salvar nova versão" }).click();
    await expect(page.getByText(/Modelo salvo \(versão \d+\)/).first()).toBeVisible();

    const cpf = cpfUnico();
    const paciente = await criarPacienteComCpf(page, cpf);
    const plano = await criarPlano(page);
    await atribuirPlano(page, paciente.id, plano.id);
    const token = await tokenDoContrato(paciente.id);

    const contexto = await browser.newContext(SEM_LOGIN);
    const publica = await contexto.newPage();
    await publica.goto(`/compartilhado/contrato/${token}`);
    await publica.getByLabel("CPF").fill(cpf);
    await publica.getByRole("button", { name: "Abrir contrato" }).click();
    await expect(publica.getByText(marca)).toBeVisible();
    await contexto.close();

    await page.goto("/contratos");
    await page.getByPlaceholder("Buscar por paciente ou plano...").fill(paciente.nome);
    await expect(page.getByRole("link", { name: paciente.nome }).first()).toBeVisible();
  });

  test("editar o plano assinado só pede nova assinatura se o contratado mudou", async ({
    page,
    browser,
  }) => {
    const cpf = cpfUnico();
    const paciente = await criarPacienteComCpf(page, cpf);
    const plano = await criarPlano(page);
    await atribuirPlano(page, paciente.id, plano.id);
    const token = await tokenDoContrato(paciente.id);

    const contexto = await browser.newContext(SEM_LOGIN);
    const publica = await contexto.newPage();
    await publica.goto(`/compartilhado/contrato/${token}`);
    await publica.getByLabel("CPF").fill(cpf);
    await publica.getByRole("button", { name: "Abrir contrato" }).click();
    await desenharAssinatura(publica);
    await publica.getByRole("checkbox").click();
    await publica.getByRole("button", { name: "Assinar contrato" }).click();
    await expect(publica.getByRole("heading", { name: "Contrato assinado" })).toBeVisible({
      timeout: 20_000,
    });

    const situacao = () =>
      comBanco(async (db) => {
        const r = await db.query<{ status: string }>(
          `SELECT status FROM "Contrato" WHERE "pacienteId" = $1 ORDER BY numero`,
          [paciente.id],
        );
        return r.rows.map((l) => l.status);
      });
    const idAtribuicao = await comBanco(async (db) => {
      const r = await db.query<{ id: string }>(
        `SELECT id FROM "PlanoAtribuicao" WHERE "pacienteId" = $1`,
        [paciente.id],
      );
      return r.rows[0].id;
    });
    const salvarEdicao = async () => {
      await page.getByRole("button", { name: "Salvar alterações" }).click();
      await page.getByRole("button", { name: "Confirmar e salvar" }).click();
      await page.waitForURL(/tab=planos/);
    };

    await page.goto(`/pacientes/${paciente.id}/planos/${idAtribuicao}/editar`);
    await salvarEdicao();
    expect(await situacao()).toEqual(["ASSINADO"]);

    await page.goto(`/pacientes/${paciente.id}/planos/${idAtribuicao}/editar`);
    await page.getByText("Trimestral", { exact: true }).click();
    await salvarEdicao();
    expect(await situacao()).toEqual(["SUBSTITUIDO", "PENDENTE"]);
    await expect(page.getByText("Aguardando assinatura")).toBeVisible();

    await publica.goto(`/compartilhado/contrato/${token}`);
    await expect(publica.getByRole("heading", { name: "Contrato indisponível" })).toBeVisible();
    await contexto.close();
  });

  test("o portal do paciente leva para a assinatura", async ({ page, browser }) => {
    const paciente = await criarPacienteComCpf(page, cpfUnico());
    const plano = await criarPlano(page);
    await atribuirPlano(page, paciente.id, plano.id);
    const token = await tokenDoContrato(paciente.id);

    const tokenPortal = nomeUnico("portal").replace(/\W/g, "");
    await comBanco((db) =>
      db.query(
        `INSERT INTO "AcessoCompartilhadoPaciente" (id, token, "pacienteId") VALUES ($1, $1, $2)`,
        [tokenPortal, paciente.id],
      ),
    );

    const contexto = await browser.newContext(SEM_LOGIN);
    const portal = await contexto.newPage();
    await portal.goto(`/compartilhado/paciente/${tokenPortal}?tab=planos`);
    const link = portal.getByRole("link", { name: "Assinar contrato" });
    await expect(link).toHaveAttribute("href", `/compartilhado/contrato/${token}`);
    await expect(portal.getByRole("button", { name: "Copiar link" })).toHaveCount(0);
    await contexto.close();
  });
  test("excluir o paciente preserva o contrato assinado e não apaga nada", async ({
    page,
    browser,
  }) => {
    const cpf = cpfUnico();
    const paciente = await criarPacienteComCpf(page, cpf);
    const plano = await criarPlano(page);
    await atribuirPlano(page, paciente.id, plano.id);
    const token = await tokenDoContrato(paciente.id);

    const contexto = await browser.newContext(SEM_LOGIN);
    const publica = await contexto.newPage();
    await publica.goto(`/compartilhado/contrato/${token}`);
    await publica.getByLabel("CPF").fill(cpf);
    await publica.getByRole("button", { name: "Abrir contrato" }).click();
    await desenharAssinatura(publica);
    await publica.getByRole("checkbox").click();
    await publica.getByRole("button", { name: "Assinar contrato" }).click();
    await expect(publica.getByRole("heading", { name: "Contrato assinado" })).toBeVisible({
      timeout: 20_000,
    });

    const tokenPortal = nomeUnico("portal-excluido").replace(/\W/g, "");
    await comBanco((db) =>
      db.query(
        `INSERT INTO "AcessoCompartilhadoPaciente" (id, token, "pacienteId") VALUES ($1, $1, $2)`,
        [tokenPortal, paciente.id],
      ),
    );

    await page.goto(`/pacientes?q=${encodeURIComponent(paciente.nome)}`);
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Paciente excluído com sucesso.")).toBeVisible();

    const salvo = await comBanco(async (db) => {
      const r = await db.query(
        `SELECT p."excluidoEm", c.status FROM "Paciente" p JOIN "Contrato" c ON c."pacienteId" = p.id WHERE p.id = $1`,
        [paciente.id],
      );
      return r.rows[0];
    });
    expect(salvo.excluidoEm).not.toBeNull();
    expect(salvo.status).toBe("ASSINADO");

    // Clínica: a tela do paciente some, mas o contrato e o PDF continuam acessíveis.
    // (o status HTTP é 200 por causa do streaming; o que importa é o conteúdo)
    await page.goto(`/pacientes/${paciente.id}`);
    await expect(page.getByText(/could not be found|não encontrad/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Compartilhar acesso" })).toHaveCount(0);
    await page.goto(`/contratos?q=${encodeURIComponent(paciente.nome)}`);
    await expect(page.getByText("(paciente excluído)").locator("visible=true").first()).toBeVisible();
    const href = await page.getByRole("link", { name: "Ver PDF" }).first().getAttribute("href");
    const pdf = await page.request.get(href!);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    // Paciente: o link público deixa de abrir.
    await publica.goto(`/compartilhado/contrato/${token}`);
    await expect(publica.getByRole("heading", { name: "Contrato indisponível" })).toBeVisible();
    await publica.goto(`/compartilhado/paciente/${tokenPortal}`);
    await expect(publica.getByText(/could not be found|não encontrad/i).first()).toBeVisible();
    await expect(publica.getByText(paciente.nome)).toHaveCount(0);
    await contexto.close();

    // O CPF continua reservado, com orientação de restaurar.
    await page.goto("/pacientes/novo");
    await page.getByLabel("Nome").fill(nomeUnico("Outro"));
    await page.getByLabel("CPF").fill(cpf);
    await page.getByRole("button", { name: "Criar paciente" }).click();
    await expect(page.getByText("Este CPF é de um paciente excluído").first()).toBeVisible();
  });

});
