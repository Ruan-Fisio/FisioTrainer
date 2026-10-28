import { test, expect, type Page } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";
import { criarPaciente } from "../fixtures/pacientes";

// Sincronização a cada 10s: dá folga para um ciclo de cada lado.
const SINCRONIZA = { timeout: 35_000 };

async function criarExame(page: Page, nome: string) {
  await page.goto("/exames/novo");
  await page.getByLabel("Nome do exame").fill(nome);
  await page.getByPlaceholder("Ex: Membros Superiores").last().fill("Dados");
  await page.getByPlaceholder("Ex: Nome do membro").last().fill("Peso");
  await page.getByRole("button", { name: "Criar exame" }).click();
  await expect(page.getByText("Exame criado com sucesso.")).toBeVisible();

  await page.goto(`/exames?q=${encodeURIComponent(nome)}`);
  const href = await page
    .getByRole("link", { name: "Editar" })
    .filter({ visible: true })
    .first()
    .getAttribute("href");
  expect(href).toMatch(/^\/exames\/.+\/editar$/);
  return href!;
}

async function adicionarTabela(page: Page, nome: string) {
  await page.getByRole("button", { name: "Adicionar tabela" }).click();
  const modal = page.getByRole("dialog", { name: "Nova tabela de referência" });
  await modal.getByLabel("Nome da tabela").fill(nome);
  await modal.getByLabel("Valor (linha 1)").fill("1");
  await modal.getByRole("button", { name: "Salvar tabela" }).click();
  await expect(modal).toHaveCount(0);
}

test.describe("edição em tempo real do modelo de exame", () => {
  test.setTimeout(120_000);

  test("duas pessoas criando tabelas ao mesmo tempo: as duas ficam e cada uma vê a do outro", async ({
    page,
  }) => {
    const urlEdicao = await criarExame(page, nomeUnico("Exame Tempo Real"));

    const outra = await page.context().newPage();
    await page.goto(urlEdicao);
    await outra.goto(urlEdicao);

    await adicionarTabela(page, "Tabela A");
    await adicionarTabela(outra, "Tabela B");

    // Cada aba recebe a tabela da outra sem recarregar.
    await expect(page.getByText("Tabela B", { exact: true })).toBeVisible(SINCRONIZA);
    await expect(outra.getByText("Tabela A", { exact: true })).toBeVisible(SINCRONIZA);
    await expect(page.getByText(/Salvo às/)).toBeVisible(SINCRONIZA);

    // O detalhe do indicador diz o que chegou de outra pessoa.
    await page.getByRole("button", { name: "Ver detalhes do salvamento" }).click();
    await expect(page.getByText(/alterou às/)).toBeVisible();
    await expect(page.getByText(/Tabela B \(nova\)/)).toBeVisible();

    // E as duas estão gravadas.
    await page.reload();
    await expect(page.getByText("Tabela A", { exact: true })).toBeVisible();
    await expect(page.getByText("Tabela B", { exact: true })).toBeVisible();
  });

  test("rascunho inválido não é salvo; Concluir salva e volta para a lista", async ({ page }) => {
    const nome = nomeUnico("Exame Autosave");
    const urlEdicao = await criarExame(page, nome);
    await page.goto(urlEdicao);

    // Seção sem nome é inválida: aparece o motivo e nada é gravado.
    await page.getByPlaceholder("Ex: Membros Superiores").filter({ visible: true }).first().fill("");
    await expect(page.getByText(/Nome da seção é obrigatório/)).toBeVisible(SINCRONIZA);
    await expect(page.getByText("Não salvo", { exact: true })).toBeVisible();

    await page.getByPlaceholder("Ex: Membros Superiores").filter({ visible: true }).first().fill("Medidas");
    // "Salvar agora" grava sem esperar o ciclo.
    await page.getByRole("button", { name: "Salvar agora" }).click();
    await expect(page.getByText(/Salvo às/)).toBeVisible({ timeout: 10_000 });
    await page.getByLabel("Descrição").fill("Salva pelo Concluir");
    await page.getByRole("button", { name: "Concluir" }).filter({ visible: true }).first().click();
    await expect(page.getByText("Exame salvo.")).toBeVisible(SINCRONIZA);
    await expect(page).toHaveURL(/\/exames(\?|$)/);

    await page.goto(urlEdicao);
    await expect(page.getByLabel("Descrição")).toHaveValue("Salva pelo Concluir");
  });

  test("exame em uso: salvar cria a versão nova sem recarregar a tela nem pular para o topo", async ({
    page,
  }) => {
    const nome = nomeUnico("Exame Em Uso");
    const urlEdicao = await criarExame(page, nome);

    // Uma avaliação deixa o exame "em uso": o próximo salvamento vira versão nova.
    const paciente = await criarPaciente(page);
    await page.goto(`/pacientes/${paciente.id}/exames/novo`);
    await page.getByRole("button", { name: "Fisioterapia" }).click();
    await page.getByLabel(/Exame \(Fisioterapia\)/).selectOption({ label: nome });
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Avaliação registrada com sucesso.")).toBeVisible();

    await page.goto(urlEdicao);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const descricao = page.getByLabel("Descrição");
    await page.getByRole("button", { name: "Adicionar tabela" }).scrollIntoViewIfNeeded();
    await adicionarTabela(page, "Tabela Versao");
    const rolagem = await page.evaluate(() => window.scrollY);
    expect(rolagem).toBeGreaterThan(0);

    await expect(page.getByText(/Salvo às/)).toBeVisible(SINCRONIZA);
    // A URL aponta para a versão nova, sem navegação: o form continua o mesmo.
    await expect(page).not.toHaveURL(urlEdicao);
    await expect(page).toHaveURL(/\/exames\/.+\/editar$/);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - rolagem)).toBeLessThan(50);
    await expect(page.getByText("Tabela Versao", { exact: true })).toBeVisible();

    // Continua editando a versão nova normalmente.
    await descricao.fill("Depois da versão nova");
    await page.getByRole("button", { name: "Concluir" }).filter({ visible: true }).first().click();
    await expect(page.getByText("Exame salvo.")).toBeVisible(SINCRONIZA);
  });
});
