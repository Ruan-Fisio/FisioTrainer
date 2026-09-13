import type { Page } from "@playwright/test";

/**
 * Preenche o campo de busca (`SearchInput`, debounced) e espera a navegação
 * resultante (`?q=...`) terminar antes de continuar — sem isso, uma ação logo em
 * seguida (ex. clicar em "Editar") pode mirar numa linha que está prestes a ser
 * desmontada pelo re-render da busca (o `Suspense` da listagem troca de `key`).
 */
export async function buscar(page: Page, paramName: string, texto: string) {
  await page.getByPlaceholder(/^Buscar/).fill(texto);
  await page.waitForURL((url) => url.searchParams.get(paramName) === texto);
}
