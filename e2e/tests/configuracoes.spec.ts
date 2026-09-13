import { test, expect } from "@playwright/test";
import { nomeUnico } from "../fixtures/nomes";

test.describe("configurações — salas", () => {
  test("cria, edita e exclui uma sala", async ({ page }) => {
    const nome = nomeUnico("Sala");
    const nomeEditado = `${nome} (editado)`;

    await page.goto("/configuracoes?tab=salas");
    await page.getByRole("button", { name: "Nova sala" }).click();
    await page.getByLabel("Nome da sala").fill(nome);
    await page.getByLabel("Educação Física").fill("7");
    await page.getByLabel("Fisioterapia").fill("3");
    await page.getByRole("button", { name: "Criar sala" }).click();
    await expect(page.getByText("Sala criada.")).toBeVisible();
    await expect(page.getByText(nome, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Editar ${nome}` }).click();
    await page.getByLabel("Nome da sala").fill(nomeEditado);
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Sala atualizada.")).toBeVisible();

    await page.getByRole("button", { name: `Excluir ${nomeEditado}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Sala excluída.")).toBeVisible();
    await expect(page.getByText(nomeEditado, { exact: true })).toHaveCount(0);
  });
});

test.describe("configurações — horários", () => {
  test("adiciona, desativa e remove um horário de fisioterapia", async ({ page }) => {
    await page.goto("/configuracoes?tab=horarios");

    await page.locator("#novo-horario-FISIOTERAPIA").fill("11:30");
    await page
      .locator("form", { has: page.locator("#novo-horario-FISIOTERAPIA") })
      .getByRole("button", { name: "Adicionar" })
      .click();

    const rotulo = page.getByText("11:30 (50 min)", { exact: true });
    await expect(rotulo).toBeVisible();
    const linha = rotulo.locator("xpath=.."); // div que também tem o checkbox e o botão remover

    // Desativa (o rótulo fica riscado) e depois remove — `.click()` em vez de `.uncheck()`
    // porque o checkbox só reflete depois do round-trip do server action.
    await linha.getByRole("checkbox").click();
    await expect(rotulo).toHaveClass(/line-through/);

    await linha.getByRole("button", { name: "Remover horário 11:30" }).click();
    await expect(page.getByText("Horário removido.")).toBeVisible();
    await expect(page.getByText("11:30 (50 min)")).not.toBeVisible();
  });
});

test.describe("configurações — funcionamento", () => {
  test("fecha e reabre um dia da semana, e cadastra/remove um feriado", async ({ page }) => {
    await page.goto("/configuracoes?tab=funcionamento");

    // `.check()`/`.uncheck()` verificam a mudança de estado logo após o clique, mas o
    // checkbox é controlado pelo servidor (`setDiaFuncionamento` + revalidatePath) — só
    // reflete depois de um round-trip. `.click()` + assert com retry cobre esse atraso.
    const domingo = page.getByLabel("Domingo");
    await expect(domingo).not.toBeChecked();
    await domingo.click();
    await expect(domingo).toBeChecked();
    await domingo.click();
    await expect(domingo).not.toBeChecked();

    const descricao = nomeUnico("Feriado teste");
    await page.getByRole("button", { name: "Novo feriado" }).click();
    await page.getByLabel("Data").fill("2027-12-25");
    await page.getByLabel("Descrição").fill(descricao);
    await page.getByRole("button", { name: "Adicionar feriado" }).click();

    await expect(page.getByText("Feriado adicionado.")).toBeVisible();
    const botaoRemover = page.getByRole("button", { name: `Remover feriado ${descricao}` });
    await expect(botaoRemover).toBeVisible();

    await botaoRemover.click();
    await page.getByRole("dialog").getByRole("button", { name: "Remover" }).click();
    await expect(page.getByText("Feriado removido.")).toBeVisible();
    await expect(botaoRemover).toHaveCount(0);
  });
});
