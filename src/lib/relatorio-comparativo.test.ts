import { describe, expect, it } from "vitest";
import { acrescentarValoresCalculados } from "./comparacao-rapida";
import {
  montarComparativo,
  numeroParaGrafico,
  type ExameParaComparativo,
} from "./relatorio-comparativo";

const exame = {
  secoes: [
    {
      id: "s1",
      nome: "Antropometria",
      campos: [
        {
          id: "c1",
          nome: "",
          repetivel: false,
          colunas: [
            { id: "peso", titulo: "Peso", tipo: "NUMERO", formatacao: "kg", valorIdeal: null, direcaoIdeal: null, opcoes: [], multiplaSelecao: false },
            { id: "altura", titulo: "Altura", tipo: "NUMERO", formatacao: "m", valorIdeal: null, direcaoIdeal: null, opcoes: [], multiplaSelecao: false },
            {
              id: "imc",
              titulo: "IMC",
              tipo: "CALCULADO",
              formula: "{Peso} / ({Altura} * {Altura})",
              formatacao: null,
              valorIdeal: "18.5-24.9",
              direcaoIdeal: "PROXIMO_IDEAL",
              opcoes: [],
              multiplaSelecao: false,
            },
          ],
        },
      ],
    },
  ],
};

const valores = (peso: string) => [
  { colunaId: "peso", linha: 0, valor: peso },
  { colunaId: "altura", linha: 0, valor: "2" },
];

describe("numeroParaGrafico", () => {
  it("CALCULADO vira número, como NUMERO", () => {
    expect(numeroParaGrafico("CALCULADO", [], false, "22.5")).toBe(22.5);
  });
});

describe("montarComparativo com coluna CALCULADO", () => {
  it("mostra o IMC calculado de cada execução, com valor ideal e distância", () => {
    const [aval, ret] = acrescentarValoresCalculados(exame, [
      { valores: valores("100") }, // IMC 25
      { valores: valores("90") }, // IMC 22.5
    ]);
    const secoes = montarComparativo(
      exame as unknown as ExameParaComparativo,
      aval.valores,
      ret.valores,
      [],
    );
    const imc = secoes[0].linhas.find((l) => l.rotulo === "IMC")!;
    expect(imc).toBeDefined();
    expect(imc.avaliacaoValor).toBe("25");
    expect(imc.retornoValor).toBe("22.5");
    expect(imc.avaliacaoNumero).toBe(25);
    expect(imc.retornoNumero).toBe(22.5);
    expect(imc.valorIdeal).toBe("18.5-24.9");
    expect(imc.retornoDist).toBe(0); // dentro da faixa ideal
    expect(imc.avaliacaoDist).not.toBe(0);
  });

  it("sem os valores calculados, a linha do IMC não aparece (comportamento anterior)", () => {
    const secoes = montarComparativo(
      exame as unknown as ExameParaComparativo,
      valores("100"),
      valores("90"),
      [],
    );
    expect(secoes[0].linhas.find((l) => l.rotulo === "IMC")).toBeUndefined();
  });
});
