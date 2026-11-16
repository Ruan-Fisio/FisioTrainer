import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "../test-db";
import { criarPaciente } from "../fixtures/pacientes";

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
