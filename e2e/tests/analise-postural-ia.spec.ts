import { test, expect } from "@playwright/test";
import { criarPaciente } from "../fixtures/pacientes";
import { anexarImagemDeTeste, idsDasFormasSalvas } from "../fixtures/imagens";

// O servidor E2E roda com ANALISE_IA_FAKE=1: o pipeline LangChain usa etapas fixas
// (foto "anterior"), sem chamar o Gemini.
test.describe("análise postural por IA nas anotações de imagem", () => {
  test("gera marcações revisáveis, desfaz em um passo e salva só ao clicar em Salvar", async ({
    page,
  }) => {
    const paciente = await criarPaciente(page);
    const { imagemId } = await anexarImagemDeTeste(paciente.id);

    await page.goto(`/pacientes/${paciente.id}?tab=imagens`);
    await page.getByRole("button", { name: "Anotar imagem: Imagem" }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByText("Arraste sobre a imagem")).toBeVisible();

    // Consentimento antes de enviar a foto.
    await dialogo.getByRole("button", { name: "Analisar com IA" }).click();
    await expect(dialogo.getByText("Google Gemini")).toBeVisible();
    await dialogo.getByRole("button", { name: "Enviar para análise" }).click();

    await expect(dialogo.getByText("Vista anterior detectada")).toBeVisible();
    // Esquema do protocolo sobre a imagem: rótulos das linhas e alerta de inclinação.
    await expect(dialogo.locator("svg text", { hasText: "Linha acromial" }).first()).toBeVisible();
    await expect(dialogo.locator("svg text", { hasText: "Linha pélvica (EIAS)" }).first()).toBeVisible();
    await expect(dialogo.locator("svg text", { hasText: "2,6°" }).first()).toBeVisible();
    // O aviso lista as linhas encontradas.
    await expect(dialogo.getByText("2,6°, inclinação para esquerda")).toBeVisible();
    expect(await idsDasFormasSalvas(imagemId)).toEqual([]); // nada gravado ainda

    // A análise inteira é um único passo de Desfazer.
    await dialogo.getByRole("button", { name: "Desfazer" }).click();
    await expect(dialogo.locator("svg text", { hasText: "Linha acromial" })).toHaveCount(0);
    await dialogo.getByRole("button", { name: "Refazer" }).click();
    await expect(dialogo.locator("svg text", { hasText: "Linha acromial" }).first()).toBeVisible();

    await dialogo.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Anotações salvas.")).toBeVisible();
    const ids = await idsDasFormasSalvas(imagemId);
    expect(ids).toEqual(
      expect.arrayContaining(["ia-eixo", "ia-acromios", "ia-acromios-alerta", "ia-pelve", "ia-pt-manubrio"]),
    );
    expect(ids.every((id) => id.startsWith("ia-"))).toBe(true);
  });
});

test.describe("análise postural por IA — celular", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("botão, consentimento e aviso cabem em 375px", async ({ page }) => {
    const paciente = await criarPaciente(page);
    await anexarImagemDeTeste(paciente.id);

    await page.goto(`/pacientes/${paciente.id}?tab=imagens`);
    await page.getByRole("button", { name: "Anotar imagem: Imagem" }).click();
    const dialogo = page.getByRole("dialog");
    const botao = dialogo.getByRole("button", { name: "Analisar com IA" });
    await expect(botao).toBeInViewport();
    await botao.click();
    await expect(dialogo.getByRole("button", { name: "Enviar para análise" })).toBeInViewport();
    await dialogo.getByLabel("Não mostrar de novo nesta sessão").check();
    await dialogo.getByRole("button", { name: "Enviar para análise" }).click();
    await expect(dialogo.getByText("Vista anterior detectada")).toBeInViewport();

    // Sem rolagem horizontal.
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(375);
  });
});
