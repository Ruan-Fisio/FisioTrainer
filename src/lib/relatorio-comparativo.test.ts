import { describe, expect, it } from "vitest";
import { acrescentarValoresCalculados } from "./comparacao-rapida";
import {
  graficosDaSecao,
  montarComparativo,
  montarRelatorioIndividual,
  montarSessaoIndividual,
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

describe("montarRelatorioIndividual", () => {
  const exameIndividual: ExameParaComparativo = {
    secoes: [
      {
        id: "s1",
        nome: "Medidas",
        campos: [
          {
            id: "c1",
            nome: "",
            repetivel: false,
            colunas: [
              { id: "peso", titulo: "Peso", tipo: "NUMERO", formatacao: "kg", valorIdeal: "60-70", direcaoIdeal: null, opcoes: [], multiplaSelecao: false },
              { id: "obs", titulo: "Observação", tipo: "TEXTO", formatacao: null, valorIdeal: null, direcaoIdeal: null, opcoes: [], multiplaSelecao: false },
            ],
          },
        ],
      },
      {
        id: "s2",
        nome: "Vazia",
        campos: [
          {
            id: "c2",
            nome: "",
            repetivel: false,
            colunas: [
              { id: "nada", titulo: "Nada", tipo: "TEXTO", formatacao: null, valorIdeal: null, direcaoIdeal: null, opcoes: [], multiplaSelecao: false },
            ],
          },
        ],
      },
      {
        id: "s3",
        nome: "Goniometria",
        campos: [
          {
            id: "c3",
            nome: "",
            repetivel: false,
            colunas: [
              { id: "gonio", titulo: "Joelho", tipo: "GONIOMETRIA", formatacao: null, valorIdeal: null, direcaoIdeal: null, opcoes: [], multiplaSelecao: false },
            ],
          },
        ],
      },
    ],
  };

  const secoes = montarRelatorioIndividual(
    exameIndividual,
    [
      { colunaId: "peso", linha: 0, valor: "75" },
      { colunaId: "obs", linha: 0, valor: "Sem dor" },
      {
        colunaId: "gonio",
        linha: 0,
        valor: JSON.stringify([{ nome: "Flexão", lado: "Direito", grauAlcancado: "120" }]),
      },
    ],
    [{ nome: "Flexão", grauIdeal: "0-140" }],
  );

  it("só traz seções com campos preenchidos", () => {
    expect(secoes.map((s) => s.nome)).toEqual(["Medidas", "Goniometria"]);
  });

  it("valor da execução na coluna principal e nada de retorno/progresso", () => {
    const peso = secoes[0].linhas.find((l) => l.rotulo === "Peso")!;
    expect(peso.avaliacaoValor).toBe("75");
    expect(peso.avaliacaoDist).toBe(5);
    expect(peso.classificacaoAvaliacao).toBe("proximo");
    expect(peso.retornoValor).toBeNull();
    expect(peso.retornoDist).toBeNull();
    expect(peso.progresso).toBeNull();
    const obs = secoes[0].linhas.find((l) => l.rotulo === "Observação")!;
    expect(obs.avaliacaoValor).toBe("Sem dor");
  });

  it("Goniometria lista o movimento com grau ideal e distância ao alvo", () => {
    const [flexao] = secoes[1].linhas;
    expect(flexao.rotulo).toBe("Flexão");
    expect(flexao.lado).toBe("Direito");
    expect(flexao.valorIdeal).toBe("0-140");
    expect(flexao.avaliacaoDist).toBe(-20);
    expect(flexao.retornoValor).toBeNull();
  });

  it("gráficos só com a barra da execução", () => {
    const [grafico] = graficosDaSecao(secoes[0]);
    expect(grafico.itens).toEqual([
      { chave: "peso::0", rotulo: "Peso", avaliacao: 75, retorno: null },
    ]);
  });
});

describe("montarSessaoIndividual", () => {
  it("mostra exame, tipo e data", () => {
    expect(montarSessaoIndividual("Postural", "RETORNO", "10/11/2026 14:00")).toEqual([
      { label: "Exame", valor: "Postural" },
      { label: "Tipo", valor: "Retorno" },
      { label: "Data", valor: "10/11/2026 14:00" },
    ]);
  });
});
