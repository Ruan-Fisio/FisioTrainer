import {
  anguloGraus,
  formatarAngulo,
  formatarDistancia,
  inclinacaoGraus,
  type Anotacoes,
  type Forma,
  type Ponto,
} from "@/lib/anotacoes-imagem";

type Medidas = { l: number; h: number; traco: number; fonte: number };

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
    traco: Math.max(2, menor * 0.005) / zoom,
    fonte: Math.max(12, menor * 0.04) / zoom,
  };
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
    case "seta":
      return <Segmento a={forma.a} b={forma.b} cor={cor} m={m} seta={forma.tipo === "seta"} />;
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
  }
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
  onPointerDown,
}: {
  forma: Forma;
  anotacoes: Pick<Anotacoes, "largura" | "altura">;
  espessura: number;
  zoom?: number;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const m = medidasDe(anotacoes, zoom);
  const comum = {
    stroke: "transparent",
    strokeWidth: espessura,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
    style: { cursor: "move" },
    onPointerDown,
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
