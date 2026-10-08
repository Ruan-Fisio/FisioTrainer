import { describe, expect, it } from "vitest";
import { agruparPorDia } from "./agrupar-por-data";

const d = (iso: string) => new Date(iso);

describe("agruparPorDia", () => {
  it("agrupa por dia, do mais recente para o mais antigo", () => {
    const itens = [
      { id: "a", data: d("2026-10-01T15:00:00-03:00") },
      { id: "b", data: d("2026-10-03T09:00:00-03:00") },
      { id: "c", data: d("2026-10-01T18:30:00-03:00") },
    ];
    const grupos = agruparPorDia(itens, (i) => i.data);
    expect(grupos.map((g) => g.dia)).toEqual(["2026-10-03", "2026-10-01"]);
    expect(grupos[1].itens.map((i) => i.id)).toEqual(["c", "a"]);
  });

  it("usa o dia de Brasília, não o UTC", () => {
    // 22h em Brasília = 01h UTC do dia seguinte.
    const grupos = agruparPorDia(
      [{ data: d("2026-10-01T22:00:00-03:00") }],
      (i) => i.data,
    );
    expect(grupos[0].dia).toBe("2026-10-01");
  });

  it("lista vazia gera nenhum grupo", () => {
    expect(agruparPorDia([], () => new Date())).toEqual([]);
  });
});
