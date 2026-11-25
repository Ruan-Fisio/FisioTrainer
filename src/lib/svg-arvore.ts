import { Fragment, isValidElement, type ReactNode } from "react";

/** Nó SVG "achatado": só tags nativas, com as props do React (camelCase). */
export type NoSvg = {
  tag: string;
  props: Record<string, unknown>;
  filhos: (NoSvg | string)[];
};

/**
 * Expande uma árvore de elementos React com componentes **puros** (sem hooks,
 * como `FormaSvg`) em nós SVG nativos, chamando cada componente como função.
 * Usado para desenhar as anotações de imagem no PDF (react-pdf tem seus
 * próprios primitivos SVG) sem duplicar a geometria do editor.
 */
export function expandirSvg(no: ReactNode): (NoSvg | string)[] {
  if (no == null || typeof no === "boolean") return [];
  if (typeof no === "string") return no === "" ? [] : [no];
  if (typeof no === "number" || typeof no === "bigint") return [String(no)];
  if (Array.isArray(no)) return no.flatMap(expandirSvg);
  if (!isValidElement(no)) return [];

  const props = (no.props ?? {}) as Record<string, unknown> & {
    children?: ReactNode;
  };
  if (no.type === Fragment) return expandirSvg(props.children);
  if (typeof no.type === "function") {
    const componente = no.type as (p: unknown) => ReactNode;
    return expandirSvg(componente(props));
  }
  if (typeof no.type !== "string") return [];

  const { children, ...resto } = props;
  return [{ tag: no.type, props: resto, filhos: expandirSvg(children) }];
}
