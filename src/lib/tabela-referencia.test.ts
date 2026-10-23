import { describe, expect, it } from "vitest";
import {
  calcularColunas,
  validarFormulasDoExame,
  type ColunaCalculo,
} from "@/lib/exame-formula";
import {
  compilarTabelas,
  parseTabelas,
  renomearChaveTabelas,
  validarTabelas,
  variaveisComTabelas,
  type TabelaReferencia,
} from "@/lib/tabela-referencia";

const faixa = (min: string, max: string) => ({ min, max });

// Limites de uma escala por sexo e idade (valores da avaliação de flexibilidade).
const flex: TabelaReferencia = {
  nome: "Flex",
  chaves: ["Sexo", "Idade"],
  saidas: ["Fraco até", "Média até"],
  linhas: [
    { faixas: [faixa("1", "1"), faixa("15", "19")], valores: ["23", "33"] },
    { faixas: [faixa("1", "1"), faixa("20", "29")], valores: ["24", "33"] },
    { faixas: [faixa("0", "0"), faixa("", "29")], valores: ["20", "30"] },
  ],
};

function coluna(c: Partial<ColunaCalculo> & Pick<ColunaCalculo, "id" | "titulo" | "tipo">): ColunaCalculo {
  return { repetivel: false, ...c };
}

const colunas: ColunaCalculo[] = [
  coluna({ id: "m", titulo: "Medida", tipo: "NUMERO" }),
  coluna({
    id: "cls",
    titulo: "Classificação",
    tipo: "MULTIPLA_ESCOLHA",
    opcoes: ["Fraco", "Média", "Acima"],
    opcoesCondicionais: [
      { opcao: "Fraco", formula: "{Medida} <= {Flex.Fraco até}" },
      { opcao: "Média", formula: "{Medida} <= {Flex.Média até}" },
      { opcao: "Acima", formula: "{Medida} > {Flex.Média até}" },
    ],
  }),
];

function classificar(medida: string, paciente: { sexo: "MASCULINO" | "FEMININO"; idade: number }) {
  const r = calcularColunas(
    colunas,
    (id) => (id === "m" ? medida : undefined),
    paciente,
    compilarTabelas([flex]),
  );
  return r.opcoesAutomaticas.get("cls");
}

describe("compilarTabelas", () => {
  it("gera uma variável Tabela.Saída por saída", () => {
    expect(compilarTabelas([flex]).map((v) => v.nome)).toEqual([
      "Flex.Fraco até",
      "Flex.Média até",
    ]);
  });

  it("linha com limite só de um lado vira >= / <=; sem limite nenhum, sempre vale", () => {
    const [v] = compilarTabelas([
      {
        nome: "T",
        chaves: ["Idade"],
        saidas: ["X"],
        linhas: [
          { faixas: [faixa("60", "")], valores: ["1"] },
          { faixas: [faixa("", "")], valores: ["2"] },
        ],
      },
    ]);
    expect(v.formula).toBe("SE({Idade} >= 60; 1; SE(1 == 1; 2; 1/0))");
  });
});

describe("tabela de referência no cálculo", () => {
  it("escolhe a linha pelo sexo e pela idade e classifica a medida", () => {
    expect(classificar("22", { sexo: "MASCULINO", idade: 17 })?.selecionadas).toEqual(["Fraco"]);
    expect(classificar("30", { sexo: "MASCULINO", idade: 17 })?.selecionadas).toEqual(["Média"]);
    expect(classificar("34", { sexo: "MASCULINO", idade: 17 })?.selecionadas).toEqual(["Acima"]);
  });

  it("a faixa etária muda o limite (mesma medida, outra classificação)", () => {
    expect(classificar("23.5", { sexo: "MASCULINO", idade: 17 })?.selecionadas).toEqual(["Média"]);
    expect(classificar("23.5", { sexo: "MASCULINO", idade: 25 })?.selecionadas).toEqual(["Fraco"]);
  });

  it("limite aberto e outro sexo", () => {
    expect(classificar("21", { sexo: "FEMININO", idade: 10 })?.selecionadas).toEqual(["Média"]);
  });

  it("paciente fora de todas as faixas dá erro em vez de valor inventado", () => {
    const r = classificar("22", { sexo: "MASCULINO", idade: 45 });
    expect(r?.selecionadas).toEqual([]);
    expect(Object.keys(r?.erros ?? {})).not.toHaveLength(0);
  });

  it("sem idade do paciente pede o preenchimento", () => {
    const r = calcularColunas(
      colunas,
      (id) => (id === "m" ? "22" : undefined),
      { sexo: "MASCULINO", idade: null },
      compilarTabelas([flex]),
    );
    expect(Object.values(r.opcoesAutomaticas.get("cls")?.erros ?? {})[0]).toContain("Idade");
  });

  it("chave pode ser uma coluna do exame, inclusive calculada", () => {
    const tabela: TabelaReferencia = {
      nome: "Ref",
      chaves: ["IMC"],
      saidas: ["Fator"],
      linhas: [
        { faixas: [faixa("", "24.9")], valores: ["1"] },
        { faixas: [faixa("25", "")], valores: ["2"] },
      ],
    };
    const cols: ColunaCalculo[] = [
      coluna({ id: "imc", titulo: "IMC", tipo: "CALCULADO", formula: "{Peso} / ({Altura} * {Altura})" }),
      coluna({ id: "peso", titulo: "Peso", tipo: "NUMERO" }),
      coluna({ id: "alt", titulo: "Altura", tipo: "NUMERO" }),
      coluna({ id: "r", titulo: "Resultado", tipo: "CALCULADO", formula: "{Ref.Fator} * 10" }),
    ];
    const bruto = (id: string) => ({ peso: "90", alt: "1.7" })[id as "peso" | "alt"];
    const r = calcularColunas(cols, bruto, null, compilarTabelas([tabela]));
    expect(r.calculados.get("r")).toEqual({ valor: 20 });
    expect(validarFormulasDoExame(cols, compilarTabelas([tabela]))).toBeNull();
  });
});

describe("validarTabelas", () => {
  it("aceita uma tabela completa", () => {
    expect(validarTabelas([flex])).toBeNull();
  });

  it.each([
    ["nome vazio", { ...flex, nome: " " }, "nome"],
    ["nome com ponto", { ...flex, nome: "A.B" }, "ponto"],
    ["sem chave", { ...flex, chaves: [] }, "chave"],
    ["sem saída", { ...flex, saidas: [] }, "resultado"],
    ["saída repetida", { ...flex, saidas: ["X", "x"] }, "dois resultados"],
    ["sem linhas", { ...flex, linhas: [] }, "ao menos uma linha"],
  ])("barra %s", (_, tabela, trecho) => {
    expect(validarTabelas([tabela as TabelaReferencia])?.mensagem).toContain(trecho);
  });

  it("barra valor vazio, faixa não numérica e mínimo maior que o máximo", () => {
    const comLinha = (linha: TabelaReferencia["linhas"][number]) => ({ ...flex, linhas: [linha] });
    expect(
      validarTabelas([comLinha({ faixas: flex.linhas[0].faixas, valores: ["23", ""] })])?.mensagem,
    ).toContain("preencha um número");
    expect(
      validarTabelas([comLinha({ faixas: [faixa("1", "1"), faixa("abc", "")], valores: ["1", "2"] })])
        ?.mensagem,
    ).toContain("precisa de números");
    expect(
      validarTabelas([comLinha({ faixas: [faixa("1", "1"), faixa("30", "20")], valores: ["1", "2"] })])
        ?.mensagem,
    ).toContain("mínimo é maior");
  });

  it("barra nome de tabela repetido", () => {
    expect(validarTabelas([flex, { ...flex, nome: "flex" }])?.tabelaIndex).toBe(1);
  });
});

describe("parseTabelas / variaveisComTabelas / renomearChaveTabelas", () => {
  it("ignora formato inesperado", () => {
    expect(parseTabelas(null)).toEqual([]);
    expect(parseTabelas([1, { nome: 2 }, "x"])).toEqual([]);
  });

  it("normaliza linhas incompletas ao tamanho de chaves/saídas", () => {
    const [t] = parseTabelas([{ nome: "T", chaves: ["Idade"], saidas: ["A", "B"], linhas: [{}] }]);
    expect(t.linhas[0]).toEqual({ faixas: [faixa("", "")], valores: ["", ""] });
  });

  it("junta as variáveis do exame com as das tabelas", () => {
    const todas = variaveisComTabelas([{ nome: "Fator", formula: "2" }], [flex]);
    expect(todas.map((v) => v.nome)).toEqual(["Fator", "Flex.Fraco até", "Flex.Média até"]);
  });

  it("renomear coluna propaga para as chaves", () => {
    const [t] = renomearChaveTabelas([flex], "idade", "Anos");
    expect(t.chaves).toEqual(["Sexo", "Anos"]);
  });
});
