/**
 * Normalização de rota para as métricas de uso (`/metrics`, spec 001).
 *
 * Regras (docs/metricas.md): a chave gravada é a rota-padrão, nunca um ID ou token.
 * Funciona por TABELA de segmentos estáticos conhecidos — todo segmento fora dela vira
 * `[id]`. Regex de "parece ID" é frágil (ex. `biblioteca-movimento` tem 20 caracteres).
 * Rota nova com segmento estático novo → adicionar em `SEGMENTOS_ESTATICOS` (o teste
 * `metricas-rota.test.ts` lista as rotas existentes).
 */

export type AreaUsoChave = "CLINICA" | "PORTAL" | "PRE_CADASTRO";

export type RotaNormalizada = { area: AreaUsoChave; chave: string };

/** Primeiro segmento das telas da clínica (`src/app/(app)/*`), exceto `metrics`. */
const TOPOS_CLINICA = new Set([
  "agenda",
  "biblioteca",
  "biblioteca-movimento",
  "cobrancas",
  "configuracoes",
  "contratos",
  "curadoria",
  "dashboard",
  "evolucoes",
  "exames",
  "logs",
  "pacientes",
  "planos",
  "servicos",
  "treinos",
  "usuarios",
]);

/** Segmentos fixos de rota (não dinâmicos) que podem aparecer depois do primeiro. */
const SEGMENTOS_ESTATICOS = new Set([
  ...TOPOS_CLINICA,
  "categorias",
  "exercicios",
  "goniometria",
  "novo",
  "nova",
  "editar",
  "despesas",
  "cobrancas",
  "documentos",
  "evolucoes",
  "exames",
  "comparar",
  "retorno",
  "planos",
  "treinos",
  "pdf",
  "financeiro",
  "contrato",
  "paciente",
]);

const MAX_SEGMENTOS = 8;
const MAX_CHARS = 200;

/**
 * `pathname` (sem host) → `{ area, chave }`, ou `null` quando a rota não deve ser
 * contada (desconhecida, `/api`, `/login`, `/metrics`, vazia ou absurda).
 */
export function normalizarRota(pathname: unknown): RotaNormalizada | null {
  if (typeof pathname !== "string" || pathname.length === 0 || pathname.length > MAX_CHARS) {
    return null;
  }
  const semQuery = pathname.split(/[?#]/)[0];
  if (!semQuery.startsWith("/")) return null;

  const segmentos = semQuery.split("/").filter(Boolean);
  if (segmentos.length === 0 || segmentos.length > MAX_SEGMENTOS) return null;

  const topo = segmentos[0];
  let area: AreaUsoChave;
  let resto: string[];
  if (topo === "compartilhado") {
    if (segmentos.length < 2) return null;
    area = "PORTAL";
    resto = segmentos;
  } else if (topo === "pre-cadastro") {
    if (segmentos.length > 1) return null;
    area = "PRE_CADASTRO";
    resto = segmentos;
  } else if (TOPOS_CLINICA.has(topo)) {
    area = "CLINICA";
    resto = segmentos;
  } else {
    return null;
  }

  const chave =
    "/" +
    resto
      .map((s, i) => (i === 0 || SEGMENTOS_ESTATICOS.has(s) ? s : "[id]"))
      .join("/");
  return { area, chave };
}
