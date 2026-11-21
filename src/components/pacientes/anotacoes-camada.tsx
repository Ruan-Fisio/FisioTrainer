import {
  anguloGraus,
  formatarAngulo,
  formatarDistancia,
  inclinacaoGraus,
  medidasRotulo,
  type Anotacoes,
  type Forma,
  type Ponto,
} from "@/lib/anotacoes-imagem";

type Medidas = {
  l: number;
  h: number;
  zoom: number;
  traco: number;
  fonte: number;
  fonteRotulo: number;
};

/**
 * Espessuras proporcionais à imagem; `zoom` divide traço e fonte para que, no
 * editor com zoom, as marcações mantenham o tamanho na tela (e não engrossem).
 */
function medidasDe(
  anotacoes: Pick<Anotacoes, "largura" | "altura">,
  zoom = 1,
): Medidas {
  const { largura: l, altura: h } = anotacoes;
  const menor = Math.min(l, h);
  return {
    l,
    h,
    zoom,
    traco: Math.max(2, menor * 0.005) / zoom,
    fonte: Math.max(12, menor * 0.04) / zoom,
    fonteRotulo: medidasRotulo("", undefined, l, h, zoom).fs,
  };
}

type FormaRotulo = Extract<Forma, { tipo: "rotulo" }>;

/** Cores fixas de cada estilo de rótulo (o `cor` da forma colore borda/chamada de linha/alerta). */
const ESTILO_ROTULO = {
  regiao: { fundo: "#dbe4f7", borda: "#b6c6ea", texto: "#1e3a8a", chamada: "#1e3a8a" },
  linha: { fundo: "#ffffff", borda: null, texto: "#1e3a8a", chamada: null },
  marco: { fundo: "#ffffff", borda: "#111827", texto: "#111827", chamada: "#111827" },
  alerta: { fundo: "#ffedd5", borda: null, texto: "#111827", chamada: null },
} as const;

/** Caixa do rótulo centrada em `pos` (largura estimada pelo nº de caracteres). */
function caixaRotulo(f: FormaRotulo, m: Medidas) {
  const { fs, fsTitulo, pad, w, h, linhas } = medidasRotulo(
    f.texto,
    f.titulo,
    m.l,
    m.h,
    m.zoom,
    f.estilo,
  );
  const C = px(f.pos, m);
  return { x: C.x - w / 2, y: C.y - h / 2, w, h, fs, fsTitulo, pad, C, linhas };
}

const px = (p: Ponto, m: Medidas) => ({ x: p.x * m.l, y: p.y * m.h });

function Rotulo({
  x,
  y,
  cor,
  m,
  children,
}: {
  x: number;
  y: number;
  cor: string;
  m: Medidas;
  children: React.ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={cor}
      fontSize={m.fonte}
      fontWeight={700}
      textAnchor="middle"
      stroke={cor === "#000000" ? "#fff" : "#000"}
      strokeWidth={m.fonte * 0.22}
      paintOrder="stroke"
      strokeLinejoin="round"
      style={{ userSelect: "none" }}
    >
      {children}
    </text>
  );
}

function Segmento({
  a,
  b,
  cor,
  m,
  seta,
}: {
  a: Ponto;
  b: Ponto;
  cor: string;
  m: Medidas;
  seta?: boolean;
}) {
  const A = px(a, m);
  const B = px(b, m);
  const ang = Math.atan2(B.y - A.y, B.x - A.x);
  const cabeca = m.fonte * 0.9;
  const ponta = (delta: number) =>
    `${B.x - cabeca * Math.cos(ang + delta)},${B.y - cabeca * Math.sin(ang + delta)}`;
  return (
    <g stroke={cor} strokeWidth={m.traco} strokeLinecap="round" fill="none">
      <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} />
      {seta && (
        <polyline points={`${ponta(-0.45)} ${B.x},${B.y} ${ponta(0.45)}`} />
      )}
    </g>
  );
}

/** Desenha uma forma. `anotacoes` fornece escala/calibração para medidas. */
export function FormaSvg({
  forma,
  anotacoes,
  zoom = 1,
}: {
  forma: Forma;
  anotacoes: Pick<Anotacoes, "largura" | "altura" | "calibracao">;
  zoom?: number;
}) {
  const m = medidasDe(anotacoes, zoom);
  const { cor } = forma;

  switch (forma.tipo) {
    case "linha":
      if (forma.tracejada) {
        const [A, B] = [px(forma.a, m), px(forma.b, m)];
        return (
          <line
            x1={A.x}
            y1={A.y}
            x2={B.x}
            y2={B.y}
            stroke={cor}
            strokeWidth={m.traco}
            strokeDasharray={`${m.traco * 3.5} ${m.traco * 2.5}`}
            strokeLinecap="round"
          />
        );
      }
      return <Segmento a={forma.a} b={forma.b} cor={cor} m={m} />;
    case "seta":
      return <Segmento a={forma.a} b={forma.b} cor={cor} m={m} seta />;
    case "medida": {
      const A = px(forma.a, m);
      const B = px(forma.b, m);
      return (
        <g>
          <Segmento a={forma.a} b={forma.b} cor={cor} m={m} />
          {[A, B].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={m.traco * 1.6} fill={cor} />
          ))}
          <Rotulo x={(A.x + B.x) / 2} y={(A.y + B.y) / 2 - m.fonte * 0.5} cor={cor} m={m}>
            {formatarDistancia(forma.a, forma.b, anotacoes)}
          </Rotulo>
        </g>
      );
    }
    case "inclinacao": {
      const A = px(forma.a, m);
      const B = px(forma.b, m);
      const comp = Math.hypot(B.x - A.x, B.y - A.y);
      const graus = inclinacaoGraus(forma.a, forma.b, m.l, m.h);
      // Referência horizontal tracejada saindo de `a` para o lado de `b`.
      const sx = B.x >= A.x ? 1 : -1;
      const ux = comp > 0 ? (B.x - A.x) / comp : sx;
      const uy = comp > 0 ? (B.y - A.y) / comp : 0;
      const r = Math.min(comp * 0.45, m.fonte * 3);
      const sweep = sx * uy > 0 ? 1 : 0;
      // Rótulo: ângulo aberto → na bissetriz, fora do arco; ângulo fechado
      // (não cabe na fatia) → do outro lado da referência horizontal.
      let lx: number;
      let ly: number;
      if (graus >= 30) {
        const bx = sx + ux;
        const by = uy;
        const nb = Math.hypot(bx, by) || 1;
        const dist = r + m.fonte * 1.5;
        lx = A.x + (bx / nb) * dist;
        ly = A.y + (by / nb) * dist + m.fonte * 0.35;
      } else {
        lx = A.x + sx * (r + m.fonte * 0.4);
        ly = uy <= 0 ? A.y + m.fonte * 1.1 : A.y - m.fonte * 0.45;
      }
      return (
        <g>
          <line
            x1={A.x}
            y1={A.y}
            x2={A.x + sx * comp}
            y2={A.y}
            stroke={cor}
            strokeWidth={m.traco * 0.7}
            strokeDasharray={`${m.traco * 3} ${m.traco * 2.5}`}
            strokeLinecap="round"
            opacity={0.8}
          />
          <Segmento a={forma.a} b={forma.b} cor={cor} m={m} />
          {r > 0 && graus > 0.5 && (
            <path
              d={`M ${A.x + sx * r} ${A.y} A ${r} ${r} 0 0 ${sweep} ${A.x + ux * r} ${A.y + uy * r}`}
              stroke={cor}
              strokeWidth={m.traco}
              fill="none"
            />
          )}
          {[A, B].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={m.traco * 1.6} fill={cor} />
          ))}
          <Rotulo
            x={lx}
            y={ly}
            cor={cor}
            m={m}
          >
            {formatarAngulo(graus)}
          </Rotulo>
        </g>
      );
    }
    case "angulo": {
      const V = px(forma.vertice, m);
      const graus = anguloGraus(forma.a, forma.vertice, forma.b, m.l, m.h);
      return (
        <g>
          <Segmento a={forma.vertice} b={forma.a} cor={cor} m={m} />
          <Segmento a={forma.vertice} b={forma.b} cor={cor} m={m} />
          <circle cx={V.x} cy={V.y} r={m.traco * 1.6} fill={cor} />
          <Rotulo x={V.x} y={V.y - m.fonte * 0.9} cor={cor} m={m}>
            {formatarAngulo(graus)}
          </Rotulo>
        </g>
      );
    }
    case "circulo": {
      const C = px(forma.centro, m);
      const B = px(forma.borda, m);
      return (
        <circle
          cx={C.x}
          cy={C.y}
          r={Math.hypot(B.x - C.x, B.y - C.y)}
          stroke={cor}
          strokeWidth={m.traco}
          fill="none"
        />
      );
    }
    case "livre":
      return (
        <polyline
          points={forma.pontos.map((p) => `${p.x * m.l},${p.y * m.h}`).join(" ")}
          stroke={cor}
          strokeWidth={m.traco}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case "texto": {
      const P = px(forma.pos, m);
      return (
        <Rotulo x={P.x} y={P.y} cor={cor} m={m}>
          {forma.texto}
        </Rotulo>
      );
    }
    case "ponto": {
      const P = px(forma.pos, m);
      return (
        <circle
          cx={P.x}
          cy={P.y}
          r={m.fonteRotulo * 0.42}
          fill={cor}
          stroke="#ffffff"
          strokeWidth={m.fonteRotulo * 0.12}
        />
      );
    }
    case "rotulo":
      return <RotuloSvg forma={forma} m={m} />;
  }
}

function RotuloSvg({ forma, m }: { forma: FormaRotulo; m: Medidas }) {
  const est = ESTILO_ROTULO[forma.estilo];
  const k = caixaRotulo(forma, m);
  const A = px(forma.alvo, m);
  const chamada = est.chamada ?? forma.cor;
  const borda = est.borda ?? forma.cor;
  const fino = Math.max(1, m.traco * 0.45);
  const ang = Math.atan2(A.y - k.C.y, A.x - k.C.x);
  const cab = k.fs * 0.6;
  const ponta = (d: number) => `${A.x - cab * Math.cos(ang + d)},${A.y - cab * Math.sin(ang + d)}`;
  const linhaTexto = k.y + k.pad * 0.4 + (forma.titulo ? k.fsTitulo * 1.2 : 0) + k.fs * 0.95;
  return (
    <g style={{ userSelect: "none" }}>
      <line x1={k.C.x} y1={k.C.y} x2={A.x} y2={A.y} stroke={chamada} strokeWidth={fino * 1.4} />
      {forma.estilo === "alerta" ? (
        <polyline
          points={`${ponta(-0.5)} ${A.x},${A.y} ${ponta(0.5)}`}
          stroke={chamada}
          strokeWidth={fino * 1.6}
          fill="none"
          strokeLinecap="round"
        />
      ) : forma.estilo === "regiao" ? (
        <circle cx={A.x} cy={A.y} r={k.fs * 0.22} fill={chamada} />
      ) : null}
      <rect
        x={k.x}
        y={k.y}
        width={k.w}
        height={k.h}
        rx={forma.estilo === "regiao" || forma.estilo === "marco" ? k.h / 2 : k.fs * 0.35}
        fill={est.fundo}
        stroke={borda}
        strokeWidth={fino * 1.6}
      />
      {forma.titulo && (
        <text
          x={k.C.x}
          y={k.y + k.pad * 0.4 + k.fsTitulo}
          fontSize={k.fsTitulo}
          fontWeight={800}
          textAnchor="middle"
          fill={est.texto}
        >
          {forma.titulo}
        </text>
      )}
      <text fontSize={k.fs} fontWeight={700} textAnchor="middle" fill={est.texto}>
        {k.linhas.map((l, i) => (
          <tspan key={i} x={k.C.x} y={linhaTexto + i * k.fs * 1.2}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/**
 * Área de toque invisível e larga sobre a forma (linhas finas são difíceis de
 * acertar com o dedo). `espessura` em unidades do viewBox.
 */
export function FormaHit({
  forma,
  anotacoes,
  espessura,
  zoom = 1,
  cursor = "move",
  rotulo,
  onPointerDown,
}: {
  forma: Forma;
  anotacoes: Pick<Anotacoes, "largura" | "altura">;
  espessura: number;
  zoom?: number;
  cursor?: React.CSSProperties["cursor"];
  /** Dica ao passar o mouse (ex.: "Apagar marcação"). */
  rotulo?: string;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const m = medidasDe(anotacoes, zoom);
  const comum = {
    stroke: "transparent",
    strokeWidth: espessura,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
    style: { cursor },
    onPointerDown,
    children: rotulo ? <title>{rotulo}</title> : undefined,
  };
  const P = (p: Ponto) => px(p, m);

  switch (forma.tipo) {
    case "linha":
    case "seta":
    case "medida":
    case "inclinacao": {
      const [A, B] = [P(forma.a), P(forma.b)];
      return <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} {...comum} />;
    }
    case "angulo": {
      const [A, V, B] = [P(forma.a), P(forma.vertice), P(forma.b)];
      return <polyline points={`${A.x},${A.y} ${V.x},${V.y} ${B.x},${B.y}`} {...comum} />;
    }
    case "circulo": {
      const [C, B] = [P(forma.centro), P(forma.borda)];
      return <circle cx={C.x} cy={C.y} r={Math.hypot(B.x - C.x, B.y - C.y)} {...comum} />;
    }
    case "livre":
      return (
        <polyline
          points={forma.pontos.map((p) => `${p.x * m.l},${p.y * m.h}`).join(" ")}
          {...comum}
        />
      );
    case "ponto": {
      const T = P(forma.pos);
      return <circle cx={T.x} cy={T.y} r={m.fonteRotulo} {...comum} fill="transparent" />;
    }
    case "rotulo": {
      const k = caixaRotulo(forma, m);
      const A = P(forma.alvo);
      return (
        <g style={{ cursor }} onPointerDown={onPointerDown}>
          {rotulo && <title>{rotulo}</title>}
          <line x1={k.C.x} y1={k.C.y} x2={A.x} y2={A.y} stroke="transparent" strokeWidth={espessura} />
          <rect x={k.x} y={k.y} width={k.w} height={k.h} fill="transparent" />
        </g>
      );
    }
    case "texto": {
      const T = P(forma.pos);
      return (
        <text
          x={T.x}
          y={T.y}
          fontSize={m.fonte}
          fontWeight={700}
          textAnchor="middle"
          {...comum}
          fill="transparent"
        >
          {forma.texto}
        </text>
      );
    }
  }
}

/** Camada SVG (somente leitura) com todas as anotações; encaixa sobre a imagem. */
export function CamadaAnotacoes({ anotacoes }: { anotacoes: Anotacoes }) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${anotacoes.largura} ${anotacoes.altura}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full"
    >
      {anotacoes.formas.map((f) => (
        <FormaSvg key={f.id} forma={f} anotacoes={anotacoes} />
      ))}
    </svg>
  );
}
