import { z } from "zod";
import {
  distanciaPx,
  formatarAngulo,
  formatarDistancia,
  limitarPonto,
  type Anotacoes,
  type Forma,
  type Ponto,
} from "@/lib/anotacoes-imagem";

/**
 * Análise postural por IA (ver `specs/003-analise-postural-ia.md`).
 *
 * A IA só devolve a vista da foto e pontos anatômicos (escala 0–1000). Todo
 * ângulo/distância é calculado aqui, e o resultado vira formas comuns do editor
 * de anotações, com id prefixado por `ia-` para poderem ser trocadas numa nova
 * análise sem mexer no que o fisio desenhou à mão.
 */

export const VISTAS = [
  "anterior",
  "posterior",
  "lateral_direita",
  "lateral_esquerda",
  "nao_postural",
] as const;
export type VistaPostural = (typeof VISTAS)[number];

export const VISTA_LABEL: Record<VistaPostural, string> = {
  anterior: "Vista anterior",
  posterior: "Vista posterior",
  lateral_direita: "Vista lateral direita",
  lateral_esquerda: "Vista lateral esquerda",
  nao_postural: "Não é foto postural",
};

export const PREFIXO_IA = "ia-";

// ---------- schemas das etapas (sem min/max: o modelo nem sempre respeita; o código limita) ----------

const pontoIa = z
  .object({
    x: z.number().describe("Horizontal, 0 = borda esquerda da imagem, 1000 = borda direita"),
    y: z.number().describe("Vertical, 0 = topo da imagem, 1000 = base"),
  })
  .describe("Ponto na escala 0–1000. Omita o campo se não conseguir localizar com confiança.");

export const classificacaoSchema = z.object({
  vista: z
    .enum(VISTAS)
    .describe(
      "anterior = paciente de frente para a câmera; posterior = de costas; " +
        "lateral_direita = lado DIREITO do paciente voltado para a câmera; " +
        "lateral_esquerda = lado ESQUERDO voltado para a câmera; " +
        "nao_postural = não é uma foto de corpo inteiro/tronco em pé para avaliação postural",
    ),
  confianca: z.number().describe("Confiança na classificação, de 0 a 1"),
});
export type Classificacao = z.infer<typeof classificacaoSchema>;

export const pontosFrontaisSchema = z.object({
  cabeca_direita: pontoIa.optional().describe("Anterior: olho direito do paciente. Posterior: lóbulo da orelha direita."),
  cabeca_esquerda: pontoIa.optional().describe("Anterior: olho esquerdo do paciente. Posterior: lóbulo da orelha esquerda."),
  ombro_direito: pontoIa.optional().describe("Acrômio direito do paciente"),
  ombro_esquerdo: pontoIa.optional().describe("Acrômio esquerdo do paciente"),
  pelve_direita: pontoIa.optional().describe("Anterior: EIAS direita. Posterior: EIPS direita (ou crista ilíaca)."),
  pelve_esquerda: pontoIa.optional().describe("Anterior: EIAS esquerda. Posterior: EIPS esquerda (ou crista ilíaca)."),
  coluna: z
    .array(pontoIa)
    .optional()
    .describe(
      "Só na vista posterior: 5 a 12 pontos sobre os processos espinhosos, de C7 (topo) até S1 (base), em ordem. Vazio na anterior.",
    ),
});
export type PontosFrontais = z.infer<typeof pontosFrontaisSchema>;

export const pontosLateraisSchema = z.object({
  trago: pontoIa.optional().describe("Trago da orelha"),
  acromio: pontoIa.optional().describe("Acrômio (ombro)"),
  trocanter: pontoIa.optional().describe("Trocânter maior do fêmur"),
  joelho: pontoIa.optional().describe("Linha articular do joelho, face lateral (ligeiramente anterior ao centro)"),
  maleolo: pontoIa.optional().describe("Maléolo lateral do tornozelo"),
});
export type PontosLaterais = z.infer<typeof pontosLateraisSchema>;

export type ResultadoAnalise =
  | { vista: "nao_postural"; confianca: number }
  | { vista: "anterior" | "posterior"; confianca: number; pontos: PontosFrontais }
  | {
      vista: "lateral_direita" | "lateral_esquerda";
      confianca: number;
      pontos: PontosLaterais;
    };

export function ehFrontal(v: VistaPostural): v is "anterior" | "posterior" {
  return v === "anterior" || v === "posterior";
}

export function ehLateral(v: VistaPostural): v is "lateral_direita" | "lateral_esquerda" {
  return v === "lateral_direita" || v === "lateral_esquerda";
}

/** Valida o resultado vindo do server (ou de qualquer fonte não confiável). */
export const resultadoAnaliseSchema: z.ZodType<ResultadoAnalise> = z.union([
  z.object({ vista: z.literal("nao_postural"), confianca: z.number() }),
  z.object({
    vista: z.enum(["anterior", "posterior"]),
    confianca: z.number(),
    pontos: pontosFrontaisSchema,
  }),
  z.object({
    vista: z.enum(["lateral_direita", "lateral_esquerda"]),
    confianca: z.number(),
    pontos: pontosLateraisSchema,
  }),
]);

// ---------- prompts ----------

export const PROMPT_CLASSIFICAR =
  "Você auxilia um fisioterapeuta na avaliação postural por fotografia. " +
  "Classifique a vista da foto. Considere 'nao_postural' se não houver uma pessoa em pé " +
  "com tronco e membros visíveis para avaliação (ex.: documento, exame de imagem, close de " +
  "uma parte do corpo).";

export function promptLocalizar(vista: VistaPostural): string {
  const base =
    "Você auxilia um fisioterapeuta na avaliação postural por fotografia. " +
    "Localize os pontos anatômicos pedidos com a maior precisão possível, na escala 0–1000 " +
    "(x = horizontal da esquerda para a direita da imagem; y = vertical de cima para baixo). " +
    "'Direito' e 'esquerdo' são sempre do PACIENTE, não da imagem. " +
    "Omita qualquer ponto que não esteja visível ou que você não consiga localizar com confiança; " +
    "nunca invente.";
  switch (vista) {
    case "anterior":
      return `${base} Vista ANTERIOR (paciente de frente): o lado direito do paciente aparece à esquerda da imagem. Não preencha 'coluna'.`;
    case "posterior":
      return `${base} Vista POSTERIOR (paciente de costas): o lado direito do paciente aparece à direita da imagem. Em 'coluna', siga os processos espinhosos de C7 até S1.`;
    case "lateral_direita":
    case "lateral_esquerda":
      return `${base} Vista LATERAL (${vista === "lateral_direita" ? "lado direito" : "lado esquerdo"} do paciente voltado para a câmera).`;
    case "nao_postural":
      return base;
  }
}

// ---------- conversão em formas ----------

/** Converte da escala 0–1000 da IA para 0..1, limitado ao quadro. */
export function normalizarPonto(p: { x: number; y: number }): Ponto {
  return limitarPonto({ x: p.x / 1000, y: p.y / 1000 });
}

type Contexto = Pick<Anotacoes, "largura" | "altura" | "calibracao"> & { cor: string };

export type FormasIa = { formas: Forma[]; ausentes: string[] };

/** Abaixo disso (graus) o par é considerado nivelado/alinhado. */
const TOLERANCIA_GRAUS = 0.5;

const meio = (a: Ponto, b: Ponto): Ponto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Texto um pouco acima de `p`, sem sair do quadro. */
function textoEm(id: string, p: Ponto, texto: string, cor: string, dy = -0.04): Forma {
  return {
    id: PREFIXO_IA + id,
    cor,
    tipo: "texto",
    pos: limitarPonto({ x: Math.min(0.85, Math.max(0.15, p.x)), y: p.y + dy }),
    texto: texto.slice(0, 80),
  };
}

/** Desvio (0–90°) da linha a→b em relação à VERTICAL, em pixels reais. */
export function desvioVerticalGraus(a: Ponto, b: Ponto, largura: number, altura: number): number {
  const dx = Math.abs(b.x - a.x) * largura;
  const dy = Math.abs(b.y - a.y) * altura;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

/**
 * Ponto da curva mais distante da reta `inicio`→`fim` (em pixels reais) e o pé
 * da perpendicular nessa reta. `null` com menos de 3 pontos ou reta degenerada.
 */
export function maiorDesvio(
  pontos: Ponto[],
  largura: number,
  altura: number,
): { ponto: Ponto; pe: Ponto; px: number } | null {
  if (pontos.length < 3) return null;
  const ini = pontos[0];
  const fim = pontos[pontos.length - 1];
  const vx = (fim.x - ini.x) * largura;
  const vy = (fim.y - ini.y) * altura;
  const n2 = vx * vx + vy * vy;
  if (n2 === 0) return null;
  let melhor: { ponto: Ponto; pe: Ponto; px: number } | null = null;
  for (const p of pontos.slice(1, -1)) {
    const wx = (p.x - ini.x) * largura;
    const wy = (p.y - ini.y) * altura;
    const t = (wx * vx + wy * vy) / n2;
    const pe = { x: ini.x + (t * vx) / largura, y: ini.y + (t * vy) / altura };
    const d = distanciaPx(p, pe, largura, altura);
    if (!melhor || d > melhor.px) melhor = { ponto: p, pe, px: d };
  }
  return melhor;
}

/**
 * Lado do PACIENTE correspondente a um deslocamento horizontal na imagem.
 * Anterior: a direita do paciente fica à esquerda da imagem; posterior, o contrário.
 */
function ladoPaciente(dxImagem: number, vista: "anterior" | "posterior"): "D" | "E" {
  const paraDireitaDaImagem = dxImagem > 0;
  return (vista === "posterior") === paraDireitaDaImagem ? "D" : "E";
}

function formasFrontais(
  vista: "anterior" | "posterior",
  bruto: PontosFrontais,
  ctx: Contexto,
): FormasIa {
  const { largura, altura, cor } = ctx;
  const formas: Forma[] = [];
  const ausentes: string[] = [];
  const pt = (p?: { x: number; y: number }) => (p ? normalizarPonto(p) : null);

  /** Par direito/esquerdo → ângulo (tipo inclinacao, medido ao vivo) + texto do lado mais baixo. */
  function par(id: string, nome: string, d: Ponto | null, e: Ponto | null) {
    if (!d || !e) {
      ausentes.push(nome.toLowerCase());
      return;
    }
    formas.push({ id: PREFIXO_IA + id, cor, tipo: "inclinacao", a: d, b: e });
    const dy = (d.y - e.y) * altura; // > 0: direito mais baixo na imagem
    const graus = (Math.atan2(Math.abs(dy), Math.abs(d.x - e.x) * largura) * 180) / Math.PI;
    const texto =
      graus < TOLERANCIA_GRAUS ? `${nome}: nivelados` : `${nome}: ${dy > 0 ? "D" : "E"} mais baixo`;
    formas.push(textoEm(`${id}-txt`, meio(d, e), texto, cor, -0.05));
  }

  const ombroD = pt(bruto.ombro_direito);
  const ombroE = pt(bruto.ombro_esquerdo);
  const pelveD = pt(bruto.pelve_direita);
  const pelveE = pt(bruto.pelve_esquerda);

  par("cabeca", "Cabeça", pt(bruto.cabeca_direita), pt(bruto.cabeca_esquerda));
  par("ombros", "Ombros", ombroD, ombroE);
  par("pelve", "Pelve", pelveD, pelveE);

  // Eixo do tronco: meio da pelve → meio dos ombros, com referência vertical.
  if (ombroD && ombroE && pelveD && pelveE) {
    const mo = meio(ombroD, ombroE);
    const mp = meio(pelveD, pelveE);
    formas.push({ id: `${PREFIXO_IA}tronco`, cor, tipo: "linha", a: mp, b: mo });
    formas.push({
      id: `${PREFIXO_IA}tronco-ref`,
      cor: "#ffffff",
      tipo: "linha",
      a: mp,
      b: { x: mp.x, y: mo.y },
    });
    const graus = desvioVerticalGraus(mp, mo, largura, altura);
    const texto =
      graus < TOLERANCIA_GRAUS
        ? `Tronco: ${formatarAngulo(graus)} (alinhado)`
        : `Tronco: ${formatarAngulo(graus)} p/ ${ladoPaciente(mo.x - mp.x, vista)}`;
    formas.push(textoEm("tronco-txt", meio(mo, mp), texto, cor, 0));
  } else {
    ausentes.push("eixo do tronco");
  }

  // Linha da coluna (só posterior).
  if (vista === "posterior") {
    const coluna = (bruto.coluna ?? []).slice(0, 20).map(normalizarPonto).sort((a, b) => a.y - b.y);
    const desvio = maiorDesvio(coluna, largura, altura);
    if (desvio) {
      const ini = coluna[0];
      const fim = coluna[coluna.length - 1];
      formas.push({ id: `${PREFIXO_IA}coluna`, cor, tipo: "livre", pontos: coluna });
      formas.push({ id: `${PREFIXO_IA}coluna-ref`, cor: "#ffffff", tipo: "linha", a: ini, b: fim });
      const dist = formatarDistancia(desvio.ponto, desvio.pe, ctx);
      const texto =
        desvio.px < 1
          ? "Coluna: sem desvio lateral"
          : `Coluna: desvio máx. ${dist} p/ ${ladoPaciente(desvio.ponto.x - desvio.pe.x, vista)}`;
      formas.push(textoEm("coluna-txt", { x: desvio.ponto.x + 0.12, y: desvio.ponto.y }, texto, cor, 0));
    } else {
      ausentes.push("coluna");
    }
  }

  return { formas, ausentes };
}

function formasLaterais(
  vista: "lateral_direita" | "lateral_esquerda",
  bruto: PontosLaterais,
  ctx: Contexto,
): FormasIa {
  const { cor } = ctx;
  const formas: Forma[] = [];
  const ausentes: string[] = [];
  // Lado direito voltado para a câmera → o paciente olha para a direita da imagem.
  const frente = vista === "lateral_direita" ? 1 : -1;

  const nomes: [keyof PontosLaterais, string][] = [
    ["trago", "orelha (trago)"],
    ["acromio", "ombro (acrômio)"],
    ["trocanter", "quadril (trocânter)"],
    ["joelho", "joelho"],
    ["maleolo", "tornozelo (maléolo)"],
  ];
  const pts = new Map<keyof PontosLaterais, Ponto>();
  for (const [k, nome] of nomes) {
    const p = bruto[k];
    if (p) pts.set(k, normalizarPonto(p));
    else ausentes.push(nome);
  }

  const cadeia = nomes.map(([k]) => pts.get(k)).filter((p): p is Ponto => !!p);
  if (cadeia.length >= 2) {
    formas.push({ id: `${PREFIXO_IA}alinhamento`, cor, tipo: "livre", pontos: cadeia });
  }

  const maleolo = pts.get("maleolo");
  if (maleolo) {
    const topo = Math.max(0, Math.min(...cadeia.map((p) => p.y)) - 0.05);
    formas.push({
      id: `${PREFIXO_IA}prumo`,
      cor: "#ffffff",
      tipo: "linha",
      a: maleolo,
      b: { x: maleolo.x, y: topo },
    });
    const trago = pts.get("trago");
    if (trago) {
      const pe = { x: maleolo.x, y: trago.y };
      // `medida` recalcula a distância (cm com calibração) se o fisio ajustar o ponto.
      formas.push({ id: `${PREFIXO_IA}cabeca`, cor, tipo: "medida", a: pe, b: trago });
      const naFrente = (trago.x - maleolo.x) * frente > 0;
      formas.push(
        textoEm(
          "cabeca-txt",
          meio(trago, pe),
          `Cabeça ${naFrente ? "à frente" : "atrás"} do prumo`,
          cor,
          -0.06,
        ),
      );
    }
  }

  return { formas, ausentes };
}

/** Resultado da IA → formas do editor (ids `ia-*`) + o que não pôde ser marcado. */
export function respostaParaFormas(resultado: ResultadoAnalise, ctx: Contexto): FormasIa {
  switch (resultado.vista) {
    case "nao_postural":
      return { formas: [], ausentes: [] };
    case "anterior":
    case "posterior":
      return formasFrontais(resultado.vista, resultado.pontos, ctx);
    case "lateral_direita":
    case "lateral_esquerda":
      return formasLaterais(resultado.vista, resultado.pontos, ctx);
  }
}

/** Troca as formas geradas por IA pelas novas, mantendo as desenhadas à mão. */
export function substituirFormasIa(atuais: Forma[], novas: Forma[]): Forma[] {
  return [...atuais.filter((f) => !f.id.startsWith(PREFIXO_IA)), ...novas];
}
