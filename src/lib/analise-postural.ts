import { z } from "zod";
import {
  distanciaPx,
  formatarAngulo,
  formatarDistancia,
  cmPorPixel,
  limitarPonto,
  medidasRotulo,
  type Anotacoes,
  type EstiloRotulo,
  type Forma,
  type Ponto,
} from "@/lib/anotacoes-imagem";

/**
 * Análise postural por IA — "Protocolo FisioTrainer" (ver
 * `specs/003-analise-postural-ia.md` e `specs/004-protocolo-postural-ia.md`).
 *
 * A IA só devolve a vista da foto e pontos anatômicos (escala 0–1000). Todo
 * ângulo/distância é calculado aqui, e o resultado vira formas comuns do editor
 * (ids `ia-*`), desenhadas no esquema do protocolo:
 *   azul = referências (eixo e linhas), verde = pontos anatômicos,
 *   laranja = assimetria, vermelho = assimetria acentuada.
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

export const COR_PROTOCOLO = {
  referencia: "#2563eb",
  ponto: "#22c55e",
  assimetria: "#f97316",
  acentuada: "#ef4444",
} as const;

/** A partir daqui (graus) um par bilateral é assimétrico (laranja)… */
export const LIMIAR_ASSIMETRIA_GRAUS = 1;
/** …e a partir daqui, acentuado (vermelho). */
export const LIMIAR_ACENTUADA_GRAUS = 5;

// ---------- schemas das etapas (sem min/max: o modelo nem sempre respeita; o código limita) ----------

const pontoIa = z.object({
  x: z.number().describe("Horizontal, 0 = borda esquerda da imagem, 1000 = borda direita"),
  y: z.number().describe("Vertical, 0 = topo da imagem, 1000 = base"),
});
const op = (descricao: string) =>
  pontoIa.optional().describe(`${descricao}. Omita se não estiver visível.`);

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

export const pontosPosteriorSchema = z.object({
  vertice: op("Topo da cabeça (vértice)"),
  c7: op("Processo espinhoso de C7 (vértebra proeminente na base do pescoço)"),
  acromio_direito: op("Acrômio direito do paciente"),
  acromio_esquerdo: op("Acrômio esquerdo do paciente"),
  escapula_direita: op("Ângulo inferior da escápula direita"),
  escapula_esquerda: op("Ângulo inferior da escápula esquerda"),
  eips_direita: op("EIPS direita (covinha de Vênus)"),
  eips_esquerda: op("EIPS esquerda (covinha de Vênus)"),
  joelho_direito: op("Centro da fossa poplítea direita"),
  joelho_esquerdo: op("Centro da fossa poplítea esquerda"),
  calcaneo_direito: op("Centro do calcâneo direito"),
  calcaneo_esquerdo: op("Centro do calcâneo esquerdo"),
});
export type PontosPosterior = z.infer<typeof pontosPosteriorSchema>;

export const pontosAnteriorSchema = z.object({
  vertice: op("Topo da cabeça (vértice)"),
  acromio_direito: op("Acrômio direito do paciente"),
  acromio_esquerdo: op("Acrômio esquerdo do paciente"),
  manubrio: op("Centro do manúbrio do esterno"),
  eias_direita: op("EIAS direita"),
  eias_esquerda: op("EIAS esquerda"),
  patela_direita: op("Centro da patela direita"),
  patela_esquerda: op("Centro da patela esquerda"),
  tornozelo_direito: op("Centro anterior do tornozelo direito, entre os maléolos"),
  tornozelo_esquerdo: op("Centro anterior do tornozelo esquerdo, entre os maléolos"),
  pe_direito: op("Dorso do pé direito, entre o 2º e o 3º metatarso"),
  pe_esquerdo: op("Dorso do pé esquerdo, entre o 2º e o 3º metatarso"),
});
export type PontosAnterior = z.infer<typeof pontosAnteriorSchema>;

export const pontosLateraisSchema = z.object({
  trago: op("Trago da orelha"),
  acromio: op("Acrômio (ombro)"),
  trocanter: op("Trocânter maior do fêmur"),
  joelho: op("Linha articular do joelho, face lateral (ligeiramente anterior ao centro)"),
  maleolo: op("Maléolo lateral do tornozelo"),
});
export type PontosLaterais = z.infer<typeof pontosLateraisSchema>;

export type ResultadoAnalise =
  | { vista: "nao_postural"; confianca: number }
  | { vista: "anterior"; confianca: number; pontos: PontosAnterior }
  | { vista: "posterior"; confianca: number; pontos: PontosPosterior }
  | {
      vista: "lateral_direita" | "lateral_esquerda";
      confianca: number;
      pontos: PontosLaterais;
    };

export function ehLateral(v: VistaPostural): v is "lateral_direita" | "lateral_esquerda" {
  return v === "lateral_direita" || v === "lateral_esquerda";
}

/** Valida o resultado vindo do server (ou de qualquer fonte não confiável). */
export const resultadoAnaliseSchema: z.ZodType<ResultadoAnalise> = z.union([
  z.object({ vista: z.literal("nao_postural"), confianca: z.number() }),
  z.object({ vista: z.literal("anterior"), confianca: z.number(), pontos: pontosAnteriorSchema }),
  z.object({ vista: z.literal("posterior"), confianca: z.number(), pontos: pontosPosteriorSchema }),
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
      return `${base} Vista ANTERIOR (paciente de frente): o lado direito do paciente aparece à esquerda da imagem.`;
    case "posterior":
      return `${base} Vista POSTERIOR (paciente de costas): o lado direito do paciente aparece à direita da imagem.`;
    case "lateral_direita":
    case "lateral_esquerda":
      return `${base} Vista LATERAL (${vista === "lateral_direita" ? "lado direito" : "lado esquerdo"} do paciente voltado para a câmera).`;
    case "nao_postural":
      return base;
  }
}

// ---------- geometria ----------

/** Converte da escala 0–1000 da IA para 0..1, limitado ao quadro. */
export function normalizarPonto(p: { x: number; y: number }): Ponto {
  return limitarPonto({ x: p.x / 1000, y: p.y / 1000 });
}

/** Desvio (0–90°) da linha a→b em relação à VERTICAL, em pixels reais. */
export function desvioVerticalGraus(a: Ponto, b: Ponto, largura: number, altura: number): number {
  const dx = Math.abs(b.x - a.x) * largura;
  const dy = Math.abs(b.y - a.y) * altura;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

/** Inclinação (0–90°) da linha a→b em relação à horizontal, em pixels reais. */
function inclinacao(a: Ponto, b: Ponto, largura: number, altura: number): number {
  const dx = Math.abs(b.x - a.x) * largura;
  const dy = Math.abs(b.y - a.y) * altura;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

// ---------- montagem do protocolo ----------

type Contexto = Pick<Anotacoes, "largura" | "altura" | "calibracao">;

/** Linha encontrada (ou não) — vai para o aviso do editor. */
export type Achado = { nome: string; detalhe: string; alerta: boolean };

export type FormasIa = { formas: Forma[]; ausentes: string[]; achados: Achado[] };

type Lado = "direita" | "esquerda";

/** Definição de um par bilateral do protocolo. */
type DefPar<K extends string> = {
  id: string;
  /** Nome no aviso e no rótulo à direita (null = sem rótulo de linha). */
  linha: string | null;
  /** Nome do par no aviso quando não há linha (ex.: "joelhos"). */
  nome: string;
  d: K;
  e: K;
  /** Só pontos (sem linha). */
  semLinha?: boolean;
};

/** Rótulo de região à esquerda, na altura `y` das estruturas indicadas. */
type DefRegiao<K extends string> = { texto: string; chaves: K[]; dy?: number };

type DefVista<K extends string> = {
  regioes: DefRegiao<K>[];
  pares: DefPar<K>[];
  marcos: { chave: K; texto: string }[];
  /** Pontos que definem a base do eixo vertical (meio entre eles). */
  base: [K, K];
  /** Ponto da linha média usado para medir desvio lateral do tronco. */
  tronco: K;
  nomes: Record<K, string>;
};

type ChavePosterior = keyof PontosPosterior;
type ChaveAnterior = keyof PontosAnterior;

const POSTERIOR: DefVista<ChavePosterior> = {
  regioes: [
    { texto: "Cabeça/Cervical", chaves: ["vertice", "c7"] },
    { texto: "Ombros", chaves: ["acromio_direito", "acromio_esquerdo"] },
    { texto: "Escápulas", chaves: ["escapula_direita", "escapula_esquerda"] },
    { texto: "Coluna/Tronco", chaves: ["escapula_direita", "escapula_esquerda", "eips_direita", "eips_esquerda"] },
    { texto: "Pelve", chaves: ["eips_direita", "eips_esquerda"] },
    { texto: "Joelhos", chaves: ["joelho_direito", "joelho_esquerdo"] },
    { texto: "Tornozelos/Pés", chaves: ["calcaneo_direito", "calcaneo_esquerdo"] },
  ],
  pares: [
    { id: "acromios", linha: "Linha acromial", nome: "ombros", d: "acromio_direito", e: "acromio_esquerdo" },
    { id: "escapulas", linha: "Linha escapular", nome: "escápulas", d: "escapula_direita", e: "escapula_esquerda" },
    { id: "pelve", linha: "Linha pélvica (EIPS)", nome: "pelve", d: "eips_direita", e: "eips_esquerda" },
    { id: "joelhos", linha: null, nome: "joelhos", d: "joelho_direito", e: "joelho_esquerdo", semLinha: true },
    { id: "pes", linha: "Alinhamento dos pés", nome: "pés", d: "calcaneo_direito", e: "calcaneo_esquerdo" },
  ],
  marcos: [{ chave: "c7", texto: "C7" }],
  base: ["calcaneo_direito", "calcaneo_esquerdo"],
  tronco: "c7",
  nomes: {
    vertice: "vértice",
    c7: "C7",
    acromio_direito: "acrômio D",
    acromio_esquerdo: "acrômio E",
    escapula_direita: "escápula D",
    escapula_esquerda: "escápula E",
    eips_direita: "EIPS D",
    eips_esquerda: "EIPS E",
    joelho_direito: "joelho D",
    joelho_esquerdo: "joelho E",
    calcaneo_direito: "calcâneo D",
    calcaneo_esquerdo: "calcâneo E",
  },
};

const ANTERIOR: DefVista<ChaveAnterior> = {
  regioes: [
    { texto: "Cabeça", chaves: ["vertice"], dy: 0.04 },
    { texto: "Ombros", chaves: ["acromio_direito", "acromio_esquerdo"] },
    { texto: "Tronco", chaves: ["manubrio", "eias_direita", "eias_esquerda"] },
    { texto: "Pelve", chaves: ["eias_direita", "eias_esquerda"] },
    { texto: "Patelas", chaves: ["patela_direita", "patela_esquerda"], dy: -0.045 },
    { texto: "Joelhos", chaves: ["patela_direita", "patela_esquerda"] },
    { texto: "Tornozelos/Pés", chaves: ["tornozelo_direito", "tornozelo_esquerdo", "pe_direito", "pe_esquerdo"] },
  ],
  pares: [
    { id: "acromios", linha: "Linha acromial", nome: "ombros", d: "acromio_direito", e: "acromio_esquerdo" },
    { id: "pelve", linha: "Linha pélvica (EIAS)", nome: "pelve", d: "eias_direita", e: "eias_esquerda" },
    { id: "joelhos", linha: null, nome: "joelhos (patelas)", d: "patela_direita", e: "patela_esquerda" },
    { id: "tornozelos", linha: null, nome: "tornozelos", d: "tornozelo_direito", e: "tornozelo_esquerdo", semLinha: true },
    { id: "pes", linha: "Alinhamento dos pés", nome: "pés", d: "pe_direito", e: "pe_esquerdo" },
  ],
  marcos: [{ chave: "manubrio", texto: "Manúbrio (esterno)" }],
  base: ["pe_direito", "pe_esquerdo"],
  tronco: "manubrio",
  nomes: {
    vertice: "vértice",
    acromio_direito: "acrômio D",
    acromio_esquerdo: "acrômio E",
    manubrio: "manúbrio",
    eias_direita: "EIAS D",
    eias_esquerda: "EIAS E",
    patela_direita: "patela D",
    patela_esquerda: "patela E",
    tornozelo_direito: "tornozelo D",
    tornozelo_esquerdo: "tornozelo E",
    pe_direito: "pé D",
    pe_esquerdo: "pé E",
  },
};

const meio = (a: Ponto, b: Ponto): Ponto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const id = (s: string) => PREFIXO_IA + s;

/** Tamanho do rótulo em fração da largura/altura da imagem. */
function tamanhoRotuloNorm(
  texto: string,
  titulo: string | undefined,
  ctx: Contexto,
  estilo?: EstiloRotulo,
) {
  const m = medidasRotulo(texto, titulo, ctx.largura, ctx.altura, 1, estilo);
  return { w: m.w / ctx.largura, h: m.h / ctx.altura };
}

function larguraRotuloNorm(texto: string, titulo: string | undefined, ctx: Contexto) {
  return tamanhoRotuloNorm(texto, titulo, ctx).w;
}

function rotulo(
  sufixo: string,
  estilo: EstiloRotulo,
  pos: Ponto,
  alvo: Ponto,
  texto: string,
  cor: string,
  titulo?: string,
): Forma {
  return {
    id: id(sufixo),
    cor,
    tipo: "rotulo",
    estilo,
    pos: limitarPonto(pos),
    alvo: limitarPonto(alvo),
    texto: texto.slice(0, 80),
    ...(titulo ? { titulo } : {}),
  };
}

/**
 * Lado do PACIENTE correspondente a um deslocamento horizontal na imagem.
 * Anterior: a direita do paciente fica à esquerda da imagem; posterior, o contrário.
 */
export function ladoPaciente(dxImagem: number, vista: "anterior" | "posterior"): Lado {
  const paraDireitaDaImagem = dxImagem > 0;
  return (vista === "posterior") === paraDireitaDaImagem ? "direita" : "esquerda";
}

function formasProtocolo<K extends string>(
  vista: "anterior" | "posterior",
  def: DefVista<K>,
  bruto: Partial<Record<K, { x: number; y: number }>>,
  ctx: Contexto,
): FormasIa {
  const { largura, altura } = ctx;
  const linhas: Forma[] = [];
  const pontos: Forma[] = [];
  const rotulos: Forma[] = [];
  const achados: Achado[] = [];
  const ausentes: string[] = [];

  const pts = new Map<K, Ponto>();
  for (const k of Object.keys(def.nomes) as K[]) {
    const p = bruto[k];
    if (p) pts.set(k, normalizarPonto(p));
  }
  if (pts.size === 0) return { formas: [], ausentes: ["nenhum ponto anatômico"], achados: [] };

  const todos = [...pts.values()];
  const minX = Math.min(...todos.map((p) => p.x));
  const maxX = Math.max(...todos.map((p) => p.x));
  const minY = Math.min(...todos.map((p) => p.y));
  const maxY = Math.max(...todos.map((p) => p.y));

  // Colunas dos rótulos: regiões à esquerda, linhas à direita (presas na borda).
  const xEsq = (t: string) => larguraRotuloNorm(t, undefined, ctx) / 2 + 0.01;
  const xDir = (t: string) => 1 - larguraRotuloNorm(t, undefined, ctx) / 2 - 0.01;
  // Borda direita da coluna de regiões: os alertas ficam logo depois dela.
  const fimColunaEsq =
    Math.max(...def.regioes.map((r) => larguraRotuloNorm(r.texto, undefined, ctx))) + 0.025;

  // Eixo vertical de referência: do meio da base (calcâneos/pés) para cima.
  const [b1, b2] = [pts.get(def.base[0]), pts.get(def.base[1])];
  const vertice = pts.get("vertice" as K);
  const eixoX = b1 && b2 ? meio(b1, b2).x : (vertice?.x ?? null);
  if (eixoX != null) {
    linhas.push({
      id: id("eixo"),
      cor: COR_PROTOCOLO.referencia,
      tipo: "linha",
      a: limitarPonto({ x: eixoX, y: minY - 0.015 }),
      b: limitarPonto({ x: eixoX, y: maxY + 0.03 }),
    });

    // Desvio lateral do tronco (C7 / manúbrio em relação ao eixo).
    const t = pts.get(def.tronco);
    if (t && b1 && b2) {
      const pe = { x: eixoX, y: t.y };
      const distPx = distanciaPx(t, pe, largura, altura);
      const escala = cmPorPixel(ctx.calibracao, largura, altura);
      const significativo = escala != null ? distPx * escala >= 1 : distPx >= altura * 0.01;
      const dist = formatarDistancia(t, pe, ctx);
      if (significativo) {
        const lado = ladoPaciente(t.x - eixoX, vista);
        achados.push({ nome: "Eixo do tronco", detalhe: `${def.nomes[def.tronco]} ${dist} para a ${lado}`, alerta: true });
      } else {
        achados.push({ nome: "Eixo do tronco", detalhe: "alinhado", alerta: false });
      }
    }
  } else {
    ausentes.push("eixo vertical");
  }

  // Pares bilaterais.
  for (const par of def.pares) {
    const d = pts.get(par.d);
    const e = pts.get(par.e);
    if (!d || !e) {
      ausentes.push(par.linha ?? par.nome);
      continue;
    }
    if (par.semLinha) continue;
    const [esq, dir] = d.x <= e.x ? [d, e] : [e, d]; // ordem na imagem
    const graus = inclinacao(d, e, largura, altura);
    const ladoBaixo: Lado = d.y > e.y ? "direita" : "esquerda";
    const yMedio = (d.y + e.y) / 2;
    const extensao = 0.04;

    if (graus < LIMIAR_ASSIMETRIA_GRAUS) {
      linhas.push({
        id: id(`${par.id}`),
        cor: COR_PROTOCOLO.referencia,
        tipo: "linha",
        tracejada: true,
        a: limitarPonto({ x: esq.x - extensao, y: esq.y }),
        b: limitarPonto({ x: dir.x + extensao, y: dir.y }),
      });
      achados.push({ nome: par.linha ?? par.nome, detalhe: "nivelada", alerta: false });
    } else {
      const acentuada = graus >= LIMIAR_ACENTUADA_GRAUS;
      const cor = acentuada ? COR_PROTOCOLO.acentuada : COR_PROTOCOLO.assimetria;
      const yRef = Math.min(d.y, e.y);
      // Referência horizontal (azul) + linha real inclinada (laranja/vermelha).
      linhas.push({
        id: id(`${par.id}-ref`),
        cor: COR_PROTOCOLO.referencia,
        tipo: "linha",
        a: limitarPonto({ x: esq.x - extensao, y: yRef }),
        b: limitarPonto({ x: dir.x + extensao, y: yRef }),
      });
      linhas.push({ id: id(par.id), cor, tipo: "linha", tracejada: true, a: esq, b: dir });
      const titulo = formatarAngulo(graus);
      const texto = `Inclinação para ${ladoBaixo}`;
      const alvo = { x: esq.x + (dir.x - esq.x) * 0.2, y: esq.y + (dir.y - esq.y) * 0.2 };
      // Caixa acima e à esquerda da linha, sem sair da imagem.
      const tam = tamanhoRotuloNorm(texto, titulo, ctx, "alerta");
      rotulos.push(
        rotulo(
          `${par.id}-alerta`,
          "alerta",
          {
            x: Math.min(1 - tam.w / 2 - 0.01, fimColunaEsq + tam.w / 2),
            y: Math.max(tam.h / 2 + 0.01, yRef - 0.03 - tam.h / 2),
          },
          alvo,
          texto,
          cor,
          titulo,
        ),
      );
      achados.push({
        nome: par.linha ?? par.nome,
        detalhe: `${titulo}, inclinação para ${ladoBaixo}${acentuada ? " (acentuada)" : ""}`,
        alerta: true,
      });
    }

    if (par.linha) {
      rotulos.push(
        rotulo(
          `${par.id}-rot`,
          "linha",
          { x: xDir(par.linha), y: yMedio },
          { x: dir.x + extensao, y: dir.y },
          par.linha,
          COR_PROTOCOLO.referencia,
        ),
      );
    }
  }

  // Pontos anatômicos (verde).
  for (const [k, p] of pts) {
    pontos.push({ id: id(`pt-${k}`), cor: COR_PROTOCOLO.ponto, tipo: "ponto", pos: p });
  }

  // Marcos com nome (C7, manúbrio).
  for (const m of def.marcos) {
    const p = pts.get(m.chave);
    if (!p) continue;
    const w = larguraRotuloNorm(m.texto, undefined, ctx);
    rotulos.push(
      rotulo(
        `marco-${m.chave}`,
        "marco",
        { x: Math.min(1 - w / 2 - 0.01, p.x + 0.08 + w / 2), y: p.y - 0.035 },
        p,
        m.texto,
        "#111827",
      ),
    );
  }

  // Regiões à esquerda, com chamada até perto do corpo.
  def.regioes.forEach((r, i) => {
    const ys = r.chaves.map((k) => pts.get(k)?.y).filter((y): y is number => y != null);
    if (ys.length === 0) return;
    const y = (Math.min(...ys) + Math.max(...ys)) / 2 + (r.dy ?? 0);
    const xs = r.chaves.map((k) => pts.get(k)?.x).filter((x): x is number => x != null);
    const borda = xEsq(r.texto) * 2 + 0.02;
    const alvoX = Math.max(borda, Math.min(...xs, minX + (maxX - minX) * 0.2) - 0.06);
    rotulos.push(
      rotulo(`reg-${i}`, "regiao", { x: xEsq(r.texto), y }, { x: alvoX, y }, r.texto, "#1e3a8a"),
    );
  });

  return { formas: [...linhas, ...pontos, ...rotulos], ausentes, achados };
}

function formasLaterais(
  vista: "lateral_direita" | "lateral_esquerda",
  bruto: PontosLaterais,
  ctx: Contexto,
): FormasIa {
  const formas: Forma[] = [];
  const ausentes: string[] = [];
  const achados: Achado[] = [];
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
    formas.push({
      id: id("alinhamento"),
      cor: COR_PROTOCOLO.assimetria,
      tipo: "livre",
      pontos: cadeia,
    });
  }

  const maleolo = pts.get("maleolo");
  if (maleolo) {
    const topo = Math.max(0, Math.min(...cadeia.map((p) => p.y)) - 0.05);
    formas.push({
      id: id("prumo"),
      cor: COR_PROTOCOLO.referencia,
      tipo: "linha",
      a: maleolo,
      b: { x: maleolo.x, y: topo },
    });
    const trago = pts.get("trago");
    if (trago) {
      const pe = { x: maleolo.x, y: trago.y };
      // `medida` recalcula a distância (cm com calibração) se o fisio ajustar o ponto.
      formas.push({ id: id("cabeca"), cor: COR_PROTOCOLO.assimetria, tipo: "medida", a: pe, b: trago });
      const naFrente = (trago.x - maleolo.x) * frente > 0;
      const detalhe = `${formatarDistancia(trago, pe, ctx)} ${naFrente ? "à frente" : "atrás"} do prumo`;
      formas.push(
        rotulo("cabeca-rot", "linha", { x: trago.x + 0.2 * frente, y: trago.y - 0.06 }, trago, `Cabeça ${naFrente ? "à frente" : "atrás"} do prumo`, COR_PROTOCOLO.referencia),
      );
      achados.push({ nome: "Cabeça", detalhe, alerta: naFrente });
    }
    achados.unshift({ nome: "Linha de prumo", detalhe: "a partir do maléolo", alerta: false });
  }

  for (const [k, p] of pts) {
    formas.push({ id: id(`pt-${k}`), cor: COR_PROTOCOLO.ponto, tipo: "ponto", pos: p });
  }

  return { formas, ausentes, achados };
}

/** Resultado da IA → formas do editor (ids `ia-*`), linhas encontradas e o que faltou. */
export function respostaParaFormas(resultado: ResultadoAnalise, ctx: Contexto): FormasIa {
  switch (resultado.vista) {
    case "nao_postural":
      return { formas: [], ausentes: [], achados: [] };
    case "posterior":
      return formasProtocolo("posterior", POSTERIOR, resultado.pontos, ctx);
    case "anterior":
      return formasProtocolo("anterior", ANTERIOR, resultado.pontos, ctx);
    case "lateral_direita":
    case "lateral_esquerda":
      return formasLaterais(resultado.vista, resultado.pontos, ctx);
  }
}

/** Troca as formas geradas por IA pelas novas, mantendo as desenhadas à mão. */
export function substituirFormasIa(atuais: Forma[], novas: Forma[]): Forma[] {
  return [...atuais.filter((f) => !f.id.startsWith(PREFIXO_IA)), ...novas];
}
