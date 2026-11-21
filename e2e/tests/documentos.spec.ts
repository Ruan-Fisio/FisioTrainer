import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "../test-db";
import { criarPaciente } from "../fixtures/pacientes";
import { criarProfissional } from "../fixtures/usuarios";
import { pngDeTeste } from "../../src/lib/png-teste";

const SEM_LOGIN = { storageState: { cookies: [], origins: [] } };

async function comBanco<T>(fn: (db: Client) => Promise<T>) {
  const db = new Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

/** Link do portal criado direto no banco (o fluxo de compartilhar tem spec própria). */
async function criarTokenPortal(pacienteId: string) {
  const token = randomBytes(32).toString("base64url");
  await comBanco((db) =>
    db.query(
      `INSERT INTO "AcessoCompartilhadoPaciente" (id, token, "pacienteId") VALUES ($1, $2, $3)`,
      [`e2e-${randomBytes(6).toString("hex")}`, token, pacienteId],
    ),
  );
  return token;
}

async function idDoDocumento(pacienteId: string) {
  return comBanco(async (db) => {
    const r = await db.query<{ id: string; valores: Record<string, unknown> }>(
      `SELECT id, valores FROM "DocumentoPaciente" WHERE "pacienteId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      [pacienteId],
    );
    return r.rows[0];
  });
}

test.describe("documentos do paciente", () => {
  test("emite atestado, edita, abre o PDF e aparece no portal", async ({ page, browser }) => {
    const paciente = await criarPaciente(page, "Documentos");

    await page.goto(`/pacientes/${paciente.id}?tab=documentos`);
    await expect(page.getByText("Nenhum documento emitido.")).toBeVisible();
    await page.getByRole("link", { name: "Novo documento" }).click();

    await page.getByRole("link", { name: /Atestado fisioterapêutico/ }).click();
    await expect(page.getByRole("heading", { name: "Atestado fisioterapêutico" })).toBeVisible();

    // Nome do paciente já vem preenchido.
    await expect(page.getByLabel("Nome completo")).toHaveValue(paciente.nome);
    await page.getByLabel("Finalidade / destinatário").fill("Empresa XPTO — RH");
    await page.getByLabel("Conclusão sobre a capacidade funcional").fill("Limitação para carga acima de 5 kg.");
    await page.getByLabel("Necessidade de afastamento temporário das atividades especificadas").check();
    await page.getByLabel("Local de emissão").fill("Vitória/ES");
    await page.getByRole("button", { name: "Emitir documento" }).click();

    await expect(page.getByText("Documento emitido.")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/pacientes/${paciente.id}\\?tab=documentos$`));
    const painel = page.getByRole("tabpanel", { name: "Documentos" });
    await expect(painel.getByText("Empresa XPTO — RH").filter({ visible: true })).toBeVisible();

    const doc = await idDoDocumento(paciente.id);
    expect(doc.valores).toMatchObject({
      paciente_nome: paciente.nome,
      indicacao_afastamento: true,
      local_emissao: "Vitória/ES",
    });
    expect(doc.valores).not.toHaveProperty("indicacao_adaptacao");

    // PDF para a equipe.
    const pdf = await page.request.get(`/api/documentos/${doc.id}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

    // Edição.
    await page.goto(`/pacientes/${paciente.id}/documentos/${doc.id}`);
    await page.getByLabel("Finalidade / destinatário").fill("Escola Municipal");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Documento atualizado.")).toBeVisible();
    await expect(painel.getByText("Escola Municipal").filter({ visible: true })).toBeVisible();

    // O próximo documento lembra o local de emissão.
    await page.goto(`/pacientes/${paciente.id}/documentos/novo?tipo=declaracao-comparecimento`);
    await expect(page.getByLabel("Local de emissão")).toHaveValue("Vitória/ES");

    // Portal do paciente, em celular.
    const token = await criarTokenPortal(paciente.id);
    const contexto = await browser.newContext({ ...SEM_LOGIN, viewport: { width: 375, height: 800 } });
    const publica = await contexto.newPage();
    await publica.goto(`/compartilhado/paciente/${token}?tab=documentos`);
    await expect(publica.getByText("Atestado fisioterapêutico")).toBeVisible();
    const link = publica.getByRole("link", { name: "Abrir PDF" });
    const href = await link.getAttribute("href");
    const pdfPublico = await publica.request.get(href!);
    expect(pdfPublico.status()).toBe(200);
    expect(pdfPublico.headers()["content-type"]).toBe("application/pdf");

    // A rota da equipe exige sessão.
    expect((await publica.request.get(`/api/documentos/${doc.id}/pdf`)).status()).toBe(401);

    // Token de outro paciente não abre o documento.
    const outro = await criarPaciente(page, "Documentos outro");
    const tokenOutro = await criarTokenPortal(outro.id);
    const negado = await publica.request.get(`/compartilhado/paciente/${tokenOutro}/documentos/${doc.id}/pdf`);
    expect(negado.status()).toBe(404);
    await contexto.close();

    // Exclusão some da aba.
    await page.goto(`/pacientes/${paciente.id}?tab=documentos`);
    await painel.getByRole("button", { name: /Excluir Atestado/ }).filter({ visible: true }).click();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await expect(page.getByText("Documento excluído.")).toBeVisible();
    await expect(page.getByText("Nenhum documento emitido.")).toBeVisible();
  });
});

async function desenharAssinatura(page: Page, deslocamento = 0) {
  const pad = page.getByTestId("assinatura-pad");
  await pad.scrollIntoViewIfNeeded();
  const caixa = (await pad.boundingBox())!;
  await page.mouse.move(caixa.x + 20, caixa.y + 20 + deslocamento);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(caixa.x + 20 + i * 20, caixa.y + 20 + deslocamento + (i % 2) * 30);
  }
  await page.mouse.up();
}

async function usuarioPorEmail(email: string) {
  return comBanco(async (db) => {
    const r = await db.query<{ id: string; assinaturaAtualId: string | null }>(
      `SELECT id, "assinaturaAtualId" FROM "User" WHERE email = $1`,
      [email],
    );
    return r.rows[0];
  });
}

async function assinaturaDoDocumento(pacienteId: string) {
  return comBanco(async (db) => {
    const r = await db.query<{ id: string; assinaturaId: string | null }>(
      `SELECT id, "assinaturaId" FROM "DocumentoPaciente" WHERE "pacienteId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      [pacienteId],
    );
    return r.rows[0];
  });
}

test.describe("assinatura do profissional nos documentos", () => {
  test("cadastra desenhando no celular, assina, congela na emissão e remove", async ({ page, browser }) => {
    // Profissional próprio: a assinatura é estado do usuário e os specs rodam em paralelo.
    const prof = await criarProfissional(page, ["Fisioterapia"]);
    const paciente = await criarPaciente(page, "Assinatura");
    const outro = await usuarioPorEmail("admin@admin.com");

    const contexto = await browser.newContext({ ...SEM_LOGIN, viewport: { width: 375, height: 800 } });
    const p = await contexto.newPage();
    await p.goto("/login");
    await p.getByLabel("E-mail").fill(prof.email);
    await p.getByLabel("Senha").fill("senha-e2e-123");
    await p.getByRole("button", { name: "Entrar" }).click();
    await expect(p).toHaveURL(/\/dashboard/);
    const eu = await usuarioPorEmail(prof.email);

    // Sem assinatura: aviso na aba e no novo documento (CA6).
    await p.goto(`/pacientes/${paciente.id}?tab=documentos`);
    await expect(p.getByTestId("aviso-sem-assinatura")).toBeVisible();
    await p.goto(`/pacientes/${paciente.id}/documentos/novo?tipo=declaracao-comparecimento`);
    await expect(p.getByTestId("aviso-sem-assinatura")).toBeVisible();

    // Tela de outro usuário: sem o card (CA3).
    await p.goto(`/usuarios/${outro.id}`);
    await expect(p.getByRole("heading", { name: "Editar usuário" })).toBeVisible();
    await expect(p.getByTestId("assinatura-card")).toHaveCount(0);

    // Desenha em 375px e salva (CA1).
    await p.goto(`/usuarios/${eu.id}`);
    const card = p.getByTestId("assinatura-card");
    const salvar = card.getByRole("button", { name: "Salvar assinatura" });
    await expect(salvar).toBeDisabled();
    await desenharAssinatura(p);
    await expect(salvar).toBeEnabled();
    await salvar.click();
    await expect(p.getByText("Assinatura salva.")).toBeVisible();
    await expect(card.getByTestId("assinatura-previa")).toBeVisible();
    const v1 = (await usuarioPorEmail(prof.email)).assinaturaAtualId;
    expect(v1).toBeTruthy();

    // Emite declaração assinada; PDF da equipe e do portal (CA4).
    await p.goto(`/pacientes/${paciente.id}/documentos/novo?tipo=declaracao-comparecimento`);
    await expect(p.getByTestId("aviso-sem-assinatura")).toHaveCount(0);
    await p.getByRole("button", { name: "Emitir documento" }).click();
    await expect(p.getByText("Documento emitido.")).toBeVisible();
    const declaracao = await assinaturaDoDocumento(paciente.id);
    expect(declaracao.assinaturaId).toBe(v1);
    expect((await p.request.get(`/api/documentos/${declaracao.id}/pdf`)).status()).toBe(200);
    const token = await criarTokenPortal(paciente.id);
    const portal = await page.request.get(`/compartilhado/paciente/${token}/documentos/${declaracao.id}/pdf`);
    expect(portal.status()).toBe(200);
    expect((await portal.body()).subarray(0, 4).toString()).toBe("%PDF");

    // Troca a assinatura: o documento antigo continua com a versão da emissão (CA5).
    await p.goto(`/usuarios/${eu.id}`);
    await card.getByRole("button", { name: "Trocar assinatura" }).click();
    await desenharAssinatura(p, 10);
    await salvar.click();
    await expect(p.getByText("Assinatura salva.")).toBeVisible();
    const v2 = (await usuarioPorEmail(prof.email)).assinaturaAtualId;
    expect(v2).toBeTruthy();
    expect(v2).not.toBe(v1);
    expect((await assinaturaDoDocumento(paciente.id)).assinaturaId).toBe(v1);

    // Encaminhamento já tem assinatura no modelo: não guarda a cadastrada (CA10).
    await p.goto(`/pacientes/${paciente.id}/documentos/novo?tipo=encaminhamento-multiprofissional`);
    await expect(p.getByTestId("aviso-sem-assinatura")).toHaveCount(0);
    await p.getByRole("button", { name: "Emitir documento" }).click();
    await expect(p.getByText("Documento emitido.")).toBeVisible();
    expect((await assinaturaDoDocumento(paciente.id)).assinaturaId).toBeNull();

    // Remove: próximos documentos sem assinatura, o antigo mantém (CA8).
    await p.goto(`/usuarios/${eu.id}`);
    await card.getByRole("button", { name: "Remover assinatura" }).click();
    await p.getByRole("button", { name: "Remover", exact: true }).click();
    await expect(p.getByText("Assinatura removida.")).toBeVisible();
    expect((await usuarioPorEmail(prof.email)).assinaturaAtualId).toBeNull();
    await p.goto(`/pacientes/${paciente.id}?tab=documentos`);
    await expect(p.getByTestId("aviso-sem-assinatura")).toBeVisible();
    const docs = await comBanco((db) =>
      db.query<{ assinaturaId: string | null }>(
        `SELECT "assinaturaId" FROM "DocumentoPaciente" WHERE id = $1`,
        [declaracao.id],
      ),
    );
    expect(docs.rows[0].assinaturaId).toBe(v1);
    await contexto.close();
  });

  test("envia foto: trata a imagem e recusa o que não é imagem", async ({ page, browser }) => {
    const prof = await criarProfissional(page, ["Fisioterapia"]);
    const contexto = await browser.newContext(SEM_LOGIN);
    const p = await contexto.newPage();
    await p.goto("/login");
    await p.getByLabel("E-mail").fill(prof.email);
    await p.getByLabel("Senha").fill("senha-e2e-123");
    await p.getByRole("button", { name: "Entrar" }).click();
    await expect(p).toHaveURL(/\/dashboard/);
    const eu = await usuarioPorEmail(prof.email);

    await p.goto(`/usuarios/${eu.id}`);
    const card = p.getByTestId("assinatura-card");
    await card.getByRole("radio", { name: "Enviar foto" }).click();
    const salvar = card.getByRole("button", { name: "Salvar assinatura" });

    // Não é imagem → erro e salvar bloqueado (CA9).
    await card.getByLabel("Foto da assinatura").setInputFiles({
      name: "assinatura.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("não sou imagem"),
    });
    await expect(card.getByRole("alert")).toContainText("Envie uma imagem");
    await expect(salvar).toBeDisabled();

    // Foto em papel branco → prévia e salvar (CA2).
    await card.getByLabel("Foto da assinatura").setInputFiles({
      name: "assinatura.png",
      mimeType: "image/png",
      buffer: pngDeTeste(1200, 400, true),
    });
    await expect(card.getByTestId("assinatura-previa")).toBeVisible();
    await expect(salvar).toBeEnabled();
    await salvar.click();
    await expect(p.getByText("Assinatura salva.")).toBeVisible();
    expect((await usuarioPorEmail(prof.email)).assinaturaAtualId).toBeTruthy();
    await contexto.close();
  });
});

