import { z } from "zod";

/**
 * Anotações desenhadas sobre uma imagem (linhas, setas, medidas, ângulos…).
 * Os pontos são normalizados (0..1) em relação à largura/altura da imagem, então
 * a anotação se reconstrói em qualquer tamanho de tela. `largura`/`altura` são as
 * dimensões naturais da imagem e permitem calcular distâncias e ângulos sem
 * distorção (a imagem não é quadrada).
 */

export const CORES_ANOTACAO = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#ffffff",
  "#000000",
] as const;

const MAX_FORMAS = 200;
const MAX_PONTOS_LIVRE = 600;
const MAX_TEXTO = 80;

const pontoSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const base = {
  id: z.string().min(1).max(40),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
};

/** Estilos de rótulo do protocolo postural (ver `analise-postural.ts`). */
export const ESTILOS_ROTULO = ["regiao", "linha", "marco", "alerta"] as const;
export type EstiloRotulo = (typeof ESTILOS_ROTULO)[number];

const formaSchema = z.discriminatedUnion("tipo", [
  z.object({
    ...base,
    tipo: z.literal("linha"),
    a: pontoSchema,
    b: pontoSchema,
    tracejada: z.boolean().optional(),
  }),
  z.object({ ...base, tipo: z.literal("seta"), a: pontoSchema, b: pontoSchema }),
  z.object({ ...base, tipo: z.literal("medida"), a: pontoSchema, b: pontoSchema }),
  /** Ângulo de 2 pontos: inclinação da linha a→b em relação à horizontal. */
  z.object({ ...base, tipo: z.literal("inclinacao"), a: pontoSchema, b: pontoSchema }),
  /** Ângulo de 3 pontos (legado: a ferramenta atual desenha `inclinacao`). */
  z.object({
    ...base,
    tipo: z.literal("angulo"),
    a: pontoSchema,
    vertice: pontoSchema,
    b: pontoSchema,
  }),
  z.object({
    ...base,
    tipo: z.literal("circulo"),
    centro: pontoSchema,
    borda: pontoSchema,
  }),
  z.object({
    ...base,
    tipo: z.literal("livre"),
    pontos: z.array(pontoSchema).min(2).max(MAX_PONTOS_LIVRE),
  }),
  z.object({
    ...base,
    tipo: z.literal("texto"),
    pos: pontoSchema,
    texto: z.string().trim().min(1).max(MAX_TEXTO),
  }),
  /** Ponto anatômico (bolinha). */
  z.object({ ...base, tipo: z.literal("ponto"), pos: pontoSchema }),
  /** Caixa de texto em `pos` com linha de chamada até `alvo`. */
  z.object({
    ...base,
    tipo: z.literal("rotulo"),
    pos: pontoSchema,
    alvo: pontoSchema,
    texto: z.string().trim().min(1).max(MAX_TEXTO),
    /** Linha de destaque acima do texto (ex.: "2,5°"). */
    titulo: z.string().trim().max(20).optional(),
    estilo: z.enum(ESTILOS_ROTULO),
  }),
]);

export const anotacoesSchema = z.object({
  versao: z.literal(1),
  largura: z.number().int().positive().max(20000),
  altura: z.number().int().positive().max(20000),
  /** Dois pontos que medem `cm` centímetros reais na imagem. */
  calibracao: z
    .object({
      a: pontoSchema,
      b: pontoSchema,
      cm: z.number().positive().max(10000),
    })
    .nullable(),
  formas: z.array(formaSchema).max(MAX_FORMAS),
});

export type Ponto = z.infer<typeof pontoSchema>;
export type Forma = z.infer<typeof formaSchema>;
export type FormaTipo = Forma["tipo"];
export type Anotacoes = z.infer<typeof anotacoesSchema>;
export type Calibracao = NonNullable<Anotacoes["calibracao"]>;

/** Quebra o texto em linhas de até `max` caracteres, por palavra. */
export function quebrarLinhas(texto: string, max: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    if (atual && (atual + " " + palavra).length > max) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [texto];
}

/** Alertas quebram em linhas curtas; os demais rótulos ficam numa linha só. */
const MAX_CARACTERES_ALERTA = 16;

/**
 * Geometria do rótulo (caixa) em unidades da imagem, sem zoom. Compartilhada pelo
 * desenho (`anotacoes-camada.tsx`) e pelo layout automático (`analise-postural.ts`).
 */
export function medidasRotulo(
  texto: string,
  titulo: string | undefined,
  largura: number,
  altura: number,
  zoom = 1,
  estilo?: EstiloRotulo,
) {
  const fs = Math.max(10, Math.min(largura, altura) * 0.023) / zoom;
  const fsTitulo = fs * 1.35;
  const pad = fs * 0.55;
  const linhas = estilo === "alerta" ? quebrarLinhas(texto, MAX_CARACTERES_ALERTA) : [texto];
  const maior = Math.max(...linhas.map((l) => l.length));
  const w = Math.max(maior * fs * 0.56, (titulo?.length ?? 0) * fsTitulo * 0.6) + pad * 2;
  const h = linhas.length * fs * 1.2 + fs * 0.1 + (titulo ? fsTitulo * 1.2 : 0) + pad * 0.8;
  return { fs, fsTitulo, pad, w, h, linhas };
}

export function anotacoesVazias(largura: number, altura: number): Anotacoes {
  return { versao: 1, largura, altura, calibracao: null, formas: [] };
}

/** Valida o JSON vindo do banco/cliente; `null` se estiver ausente ou inválido. */
export function lerAnotacoes(valor: unknown): Anotacoes | null {
  if (valor == null) return null;
  const r = anotacoesSchema.safeParse(valor);
  return r.success ? r.data : null;
}

/** Distância em pixels da imagem original entre dois pontos normalizados. */
export function distanciaPx(
  a: Ponto,
  b: Ponto,
  largura: number,
  altura: number,
): number {
  return Math.hypot((a.x - b.x) * largura, (a.y - b.y) * altura);
}

/** Centímetros por pixel, ou `null` sem calibração válida (pontos coincidentes). */
export function cmPorPixel(
  calibracao: Calibracao | null,
  largura: number,
  altura: number,
): number | null {
  if (!calibracao) return null;
  const px = distanciaPx(calibracao.a, calibracao.b, largura, altura);
  return px > 0 ? calibracao.cm / px : null;
}

/** "12,3 cm" com calibração; "245 px" sem. */
export function formatarDistancia(
  a: Ponto,
  b: Ponto,
  anotacoes: Pick<Anotacoes, "largura" | "altura" | "calibracao">,
): string {
  const px = distanciaPx(a, b, anotacoes.largura, anotacoes.altura);
  const escala = cmPorPixel(
    anotacoes.calibracao,
    anotacoes.largura,
    anotacoes.altura,
  );
  if (escala == null) return `${Math.round(px)} px`;
  return `${(px * escala).toFixed(1).replace(".", ",")} cm`;
}

/** Ângulo (0–180°) no vértice entre os segmentos vértice→a e vértice→b. */
export function anguloGraus(
  a: Ponto,
  vertice: Ponto,
  b: Ponto,
  largura: number,
  altura: number,
): number {
  const ax = (a.x - vertice.x) * largura;
  const ay = (a.y - vertice.y) * altura;
  const bx = (b.x - vertice.x) * largura;
  const by = (b.y - vertice.y) * altura;
  const na = Math.hypot(ax, ay);
  const nb = Math.hypot(bx, by);
  if (na === 0 || nb === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (na * nb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Ângulo (0–90°) entre a linha a→b e a horizontal, medido em pixels reais.
 * 0° = horizontal, 90° = vertical; pontos coincidentes devolvem 0.
 */
export function inclinacaoGraus(
  a: Ponto,
  b: Ponto,
  largura: number,
  altura: number,
): number {
  const dx = Math.abs(b.x - a.x) * largura;
  const dy = Math.abs(b.y - a.y) * altura;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function formatarAngulo(graus: number): string {
  return `${graus.toFixed(1).replace(".", ",")}°`;
}

/** Limita um ponto ao quadro da imagem. */
export function limitarPonto(p: Ponto): Ponto {
  return {
    x: Math.min(1, Math.max(0, p.x)),
    y: Math.min(1, Math.max(0, p.y)),
  };
}

/** Pontos editáveis (alças) de uma forma, na ordem usada por `moverPonto`. */
export function pontosDaForma(f: Forma): Ponto[] {
  switch (f.tipo) {
    case "linha":
    case "seta":
    case "medida":
    case "inclinacao":
      return [f.a, f.b];
    case "angulo":
      return [f.a, f.vertice, f.b];
    case "circulo":
      return [f.centro, f.borda];
    case "texto":
    case "ponto":
      return [f.pos];
    case "rotulo":
      return [f.pos, f.alvo];
    case "livre":
      return []; // só se move inteira
  }
}

/** Move uma alça da forma para `p` (limitado ao quadro da imagem). */
export function moverPonto(f: Forma, indice: number, p: Ponto): Forma {
  const q = limitarPonto(p);
  switch (f.tipo) {
    case "linha":
    case "seta":
    case "medida":
    case "inclinacao":
      return indice === 0 ? { ...f, a: q } : indice === 1 ? { ...f, b: q } : f;
    case "angulo":
      return indice === 0
        ? { ...f, a: q }
        : indice === 1
          ? { ...f, vertice: q }
          : indice === 2
            ? { ...f, b: q }
            : f;
    case "circulo":
      return indice === 0
        ? { ...f, centro: q }
        : indice === 1
          ? { ...f, borda: q }
          : f;
    case "texto":
    case "ponto":
      return indice === 0 ? { ...f, pos: q } : f;
    case "rotulo":
      return indice === 0 ? { ...f, pos: q } : indice === 1 ? { ...f, alvo: q } : f;
    case "livre":
      return f;
  }
}

/**
 * Desloca a forma inteira por (dx, dy). O deslocamento é reduzido para que
 * nenhum ponto saia da imagem, preservando o formato (não deforma ao bater na borda).
 */
export function transladar(f: Forma, dx: number, dy: number): Forma {
  const pts = f.tipo === "livre" ? f.pontos : pontosDaForma(f);
  if (pts.length === 0) return f;
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const mx = Math.min(Math.max(dx, -minX), 1 - maxX);
  const my = Math.min(Math.max(dy, -minY), 1 - maxY);
  const mv = (p: Ponto): Ponto => ({ x: p.x + mx, y: p.y + my });

  switch (f.tipo) {
    case "linha":
    case "seta":
    case "medida":
    case "inclinacao":
      return { ...f, a: mv(f.a), b: mv(f.b) };
    case "angulo":
      return { ...f, a: mv(f.a), vertice: mv(f.vertice), b: mv(f.b) };
    case "circulo":
      return { ...f, centro: mv(f.centro), borda: mv(f.borda) };
    case "texto":
    case "ponto":
      return { ...f, pos: mv(f.pos) };
    case "rotulo":
      return { ...f, pos: mv(f.pos), alvo: mv(f.alvo) };
    case "livre":
      return { ...f, pontos: f.pontos.map(mv) };
  }
}

/**
 * Alinha `p` na horizontal ou na vertical em relação a `origem` (medido em
 * pixels reais, não em coordenadas normalizadas). Sem `forcar`, funciona como
 * ímã: só trava se estiver a até `tolGraus` de um eixo. Com `forcar`, sempre
 * trava no eixo mais próximo.
 */
export function alinharReto(
  origem: Ponto,
  p: Ponto,
  largura: number,
  altura: number,
  forcar = false,
  tolGraus = 8,
): Ponto {
  const dx = Math.abs(p.x - origem.x) * largura;
  const dy = Math.abs(p.y - origem.y) * altura;
  if (dx === 0 && dy === 0) return p;
  const graus = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = horizontal, 90 = vertical
  const horizontal = forcar ? graus < 45 : graus <= tolGraus;
  const vertical = forcar ? graus >= 45 : graus >= 90 - tolGraus;
  if (horizontal) return { x: p.x, y: origem.y };
  if (vertical) return { x: origem.x, y: p.y };
  return p;
}

/** Ponto fixo em relação ao qual a alça `indice` pode ser alinhada (ou null). */
export function pontoAncora(f: Forma, indice: number): Ponto | null {
  switch (f.tipo) {
    case "linha":
    case "seta":
    case "medida":
    case "inclinacao":
      return indice === 0 ? f.b : indice === 1 ? f.a : null;
    case "angulo":
      return indice === 0 || indice === 2 ? f.vertice : null;
    default:
      return null;
  }
}
