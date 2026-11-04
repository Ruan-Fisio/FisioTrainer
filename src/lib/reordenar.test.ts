import { describe, expect, it } from "vitest";
import {
  indiceAposMover,
  moverItem,
  registrarChavesEstaveis,
  remapearIndicesAposMover,
} from "@/lib/reordenar";

describe("moverItem", () => {
  it("move para baixo e para cima", () => {
    expect(moverItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moverItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("não altera a lista original", () => {
    const lista = ["a", "b"];
    moverItem(lista, 0, 1);
    expect(lista).toEqual(["a", "b"]);
  });

  it("devolve a mesma lista quando não há o que mover", () => {
    const lista = ["a", "b"];
    expect(moverItem(lista, 1, 1)).toBe(lista);
    expect(moverItem(lista, -1, 0)).toBe(lista);
    expect(moverItem(lista, 0, 2)).toBe(lista);
    expect(moverItem([], 0, 0)).toEqual([]);
  });
});

describe("indiceAposMover", () => {
  it("acompanha cada item em qualquer movimento", () => {
    const lista = ["a", "b", "c", "d", "e"];
    for (let origem = 0; origem < lista.length; origem++) {
      for (let destino = 0; destino < lista.length; destino++) {
        const movida = moverItem(lista, origem, destino);
        lista.forEach((item, i) => {
          expect(movida[indiceAposMover(i, origem, destino)]).toBe(item);
        });
      }
    }
  });
});

describe("remapearIndicesAposMover", () => {
  it("seção retraída continua retraída depois de reordenar", () => {
    // Retraídas: a (0) e c (2). Mover a para o fim: [b, c, d, a].
    expect(remapearIndicesAposMover(new Set([0, 2]), 0, 3)).toEqual(new Set([3, 1]));
  });

  it("conjunto vazio continua vazio", () => {
    expect(remapearIndicesAposMover(new Set(), 0, 1)).toEqual(new Set());
  });
});

describe("registrarChavesEstaveis", () => {
  it("id gravado mantém a chave do id local", () => {
    expect(registrarChavesEstaveis({}, { local: "banco" })).toEqual({ banco: "local" });
  });

  it("nova versão mantém a chave original em sequência de gravações", () => {
    const primeira = registrarChavesEstaveis({}, { local: "v1" });
    expect(registrarChavesEstaveis(primeira, { v1: "v2" }).v2).toBe("local");
  });
});
