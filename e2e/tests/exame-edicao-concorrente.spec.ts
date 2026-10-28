import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";

test.describe("edição simultânea do modelo de exame", () => {
  test("quem salva de uma tela desatualizada é barrado e não apaga o que o outro gravou", async ({
    page,
  }) => {
    const nomeExame = nomeUnico("Exame Concorrente");

    await page.goto("/exames/novo");
    await page.getByLabel("Nome do exame").fill(nomeExame);
    await page.getByPlaceholder("Ex: Membros Superiores").last().fill("Dados");
    await page.getByPlaceholder("Ex: Nome do membro").last().fill("Peso");
    await page.getByRole("button", { name: "Criar exame" }).click();
    await expect(page.getByText("Exame criado com sucesso.")).toBeVisible();

    await page.goto(`/exames?q=${encodeURIComponent(nomeExame)}`);
    const urlEdicao = await page
      .getByRole("link", { name: "Editar" })
      .filter({ visible: true })
      .first()
      .getAttribute("href");
    expect(urlEdicao).toMatch(/^\/exames\/.+\/editar$/);

    // Duas pessoas abrem a edição ao mesmo tempo.
    const outra = await page.context().newPage();
    await page.goto(urlEdicao!);
    await outra.goto(urlEdicao!);

    // A primeira salva...
    await page.getByLabel("Nome do exame").fill(`${nomeExame} A`);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Exame atualizado com sucesso.")).toBeVisible();

    // ...e a segunda, com a tela antiga, é recusada.
    await outra.getByLabel("Descrição").fill("Alteração da tela antiga");
    await outra.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(outra.getByText(/Outra pessoa salvou este exame/).first()).toBeVisible();

    // O que a primeira gravou continua lá; recarregando, a segunda consegue salvar.
    await outra.reload();
    await expect(outra.getByLabel("Nome do exame")).toHaveValue(`${nomeExame} A`);
    await outra.getByLabel("Descrição").fill("Alteração depois de recarregar");
    await outra.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(outra.getByText("Exame atualizado com sucesso.")).toBeVisible();
  });
});
