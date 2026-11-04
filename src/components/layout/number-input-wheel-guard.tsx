"use client";

import { useEffect } from "react";

/**
 * Impede que a roda do mouse altere campos numéricos em toda a aplicação: tira o foco do
 * campo antes de o navegador aplicar o incremento. `preventDefault` também evitaria a
 * mudança, mas travaria a rolagem da página com o ponteiro sobre o campo.
 *
 * Listener único em `document` (e não `onWheel` no `Input`) porque o `Input` também é
 * usado em Server Components, que não aceitam event handlers, e assim cobre dialogs em
 * portal e qualquer `<input type="number">` nativo.
 */
export function NumberInputWheelGuard() {
  useEffect(() => {
    function aoRolar(event: WheelEvent) {
      const alvo = event.target;
      if (
        alvo instanceof HTMLInputElement &&
        alvo.type === "number" &&
        alvo === document.activeElement
      ) {
        alvo.blur();
      }
    }

    document.addEventListener("wheel", aoRolar, { capture: true, passive: true });
    return () => document.removeEventListener("wheel", aoRolar, { capture: true });
  }, []);

  return null;
}
