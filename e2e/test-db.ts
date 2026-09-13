/**
 * URL do banco de teste usado pela suíte E2E (Playwright) — SEMPRE separado do banco de
 * dev (`fisiotrainer`), pra nunca sujar dados que você navega manualmente (ex. o paciente
 * de teste Guilherme Mataveli). Configurável via `DATABASE_URL_TEST` no `.env`; sem isso,
 * cai no banco `fisiotrainer_test` no mesmo container Docker local
 * (`docker-compose.yml` já expõe essas mesmas credenciais em texto puro).
 */
export const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://fisiotrainer:fisiotrainer@localhost:5432/fisiotrainer_test";

/** Nome do banco de teste, extraído da URL (usado pra criar o banco se ele não existir). */
export function nomeBancoDeTeste(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}
