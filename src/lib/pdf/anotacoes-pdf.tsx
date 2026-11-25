import type { ReactNode } from "react";
import {
  Circle,
  G,
  Line,
  Path,
  Polyline,
  Rect,
  Svg,
  Text,
  Tspan,
} from "@react-pdf/renderer";
import { FormaSvg } from "@/components/pacientes/anotacoes-camada";
import type { Anotacoes } from "@/lib/anotacoes-imagem";
import { expandirSvg, type NoSvg } from "@/lib/svg-arvore";

// Primitivos do react-pdf aceitam as mesmas props SVG (camelCase) do React DOM.
type Primitivo = (props: Record<string, unknown> & { children?: ReactNode }) => ReactNode;
const PRIMITIVOS: Record<string, Primitivo> = {
  g: G as unknown as Primitivo,
  line: Line as unknown as Primitivo,
  polyline: Polyline as unknown as Primitivo,
  circle: Circle as unknown as Primitivo,
  rect: Rect as unknown as Primitivo,
  path: Path as unknown as Primitivo,
  text: Text as unknown as Primitivo,
  tspan: Tspan as unknown as Primitivo,
};

/** Props que só fazem sentido na tela (cursor, seleção, eventos, paint-order). */
function propsPdf(no: NoSvg): Record<string, unknown> {
  const { style, paintOrder, fontSize, fontWeight, ...resto } = no.props;
  void style;
  void paintOrder;
  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(resto)) {
    if (!k.startsWith("on") && v !== undefined) props[k] = v;
  }
  if (no.tag === "text" || no.tag === "tspan") {
    const negrito = Number(fontWeight ?? 400) >= 600;
    props.style = {
      fontFamily: negrito ? "Helvetica-Bold" : "Helvetica",
      ...(fontSize !== undefined ? { fontSize } : {}),
    };
  }
  return props;
}

function converter(no: NoSvg | string, chave: string): ReactNode {
  if (typeof no === "string") return no;
  const Primitivo = PRIMITIVOS[no.tag];
  if (!Primitivo) return null; // <title> e afins: só tooltip na tela.
  const props = propsPdf(no);
  const filhos = no.filhos.map((f, i) => converter(f, `${chave}.${i}`));

  // paint-order="stroke" (contorno atrás do texto) não existe no PDF:
  // desenha o texto duas vezes — primeiro só o contorno, depois só o preenchimento.
  if (no.tag === "text" && no.props.paintOrder === "stroke" && props.stroke) {
    return (
      <G key={chave}>
        <Primitivo {...props} fill={props.stroke as string}>
          {filhos}
        </Primitivo>
        <Primitivo {...props} stroke={undefined} strokeWidth={undefined}>
          {filhos}
        </Primitivo>
      </G>
    );
  }
  return (
    <Primitivo key={chave} {...props}>
      {filhos}
    </Primitivo>
  );
}

/**
 * Anotações da imagem desenhadas com os primitivos SVG do react-pdf, a partir
 * do mesmo `FormaSvg` do editor (mesma geometria, cores e textos da tela).
 * Fica por cima da imagem, ocupando `largura` × `altura` pontos.
 */
export function AnotacoesPdf({
  anotacoes,
  largura,
  altura,
}: {
  anotacoes: Anotacoes;
  largura: number;
  altura: number;
}) {
  const nos = expandirSvg(
    anotacoes.formas.map((forma) => (
      <FormaSvg key={forma.id} forma={forma} anotacoes={anotacoes} />
    )),
  );
  return (
    <Svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${anotacoes.largura} ${anotacoes.altura}`}
      preserveAspectRatio="none"
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      {nos.map((no, i) => converter(no, String(i)))}
    </Svg>
  );
}
