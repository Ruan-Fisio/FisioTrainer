import { describe, expect, it } from "vitest";
import {
  avaliarCondicaoOpcao,
  avaliarFormula,
  calcularColunas,
  calcularColunasFormula,
  extrairReferencias,
  formatarNumeroFormula,
  normalizarTitulo,
  parseOpcoesCondicionais,
  renomearReferenciaFormula,
  validarFormulasDoExame,
  type ColunaCalculo,
  type ColunaValidavel,
} from "./exame-formula";

describe("extrairReferencias", () => {
  it("extrai nomes únicos, ignorando repetição e espaços", () => {
    expect(extrairReferencias("{Peso} / ({Altura} * {Altura})")).toEqual([
      "Peso",
      "Altura",
    ]);
  });

  it("devolve lista vazia sem tokens", () => {
    expect(extrairReferencias("1 + 2")).toEqual([]);
  });
});

describe("renomearReferenciaFormula", () => {
  it("substitui o token do título antigo pelo novo", () => {
    expect(
      renomearReferenciaFormula("{Peso} / ({Altura} * {Altura})", "Altura", "Estatura"),
    ).toBe("{Peso} / ({Estatura} * {Estatura})");
  });

  it("é case-insensitive na busca, mas usa o novo título como veio", () => {
    expect(renomearReferenciaFormula("{peso} * 2", "Peso", "Massa")).toBe("{Massa} * 2");
  });

  it("não mexe em outros tokens", () => {
    expect(renomearReferenciaFormula("{A} + {B}", "C", "D")).toBe("{A} + {B}");
  });
});

describe("avaliarFormula", () => {
  it("calcula IMC corretamente", () => {
    const valores = new Map([
      [normalizarTitulo("Peso"), 70],
      [normalizarTitulo("Altura"), 1.75],
    ]);
    const resultado = avaliarFormula("{Peso} / ({Altura} * {Altura})", valores);
    expect(resultado).toHaveProperty("valor");
    if ("valor" in resultado) {
      expect(resultado.valor).toBeCloseTo(22.857, 2);
    }
  });

  it("retorna erro citando os campos faltando (um)", () => {
    const valores = new Map([[normalizarTitulo("Peso"), 70]]);
    const resultado = avaliarFormula("{Peso} / ({Altura} * {Altura})", valores);
    expect(resultado).toEqual({ erro: "Preencha Altura para calcular" });
  });

  it("retorna erro citando os campos faltando (múltiplos)", () => {
    const resultado = avaliarFormula("{Peso} / ({Altura} * {Altura})", new Map());
    expect(resultado).toEqual({ erro: "Preencha Peso e Altura para calcular" });
  });

  it("trata divisão por zero", () => {
    const valores = new Map([
      [normalizarTitulo("Peso"), 70],
      [normalizarTitulo("Altura"), 0],
    ]);
    const resultado = avaliarFormula("{Peso} / {Altura}", valores);
    expect(resultado).toEqual({
      erro: "Não foi possível calcular (divisão por zero)",
    });
  });

  it("suporta encadeamento (fórmula referenciando outra calculada)", () => {
    const valores = new Map([[normalizarTitulo("IMC"), 22.86]]);
    const resultado = avaliarFormula("{IMC} * 2", valores);
    expect(resultado).toEqual({ valor: 45.72 });
  });

  it("nunca usa eval — expressão maliciosa vira erro de sintaxe, não execução", () => {
    const resultado = avaliarFormula("1; console.log('x')", new Map());
    expect(resultado).toHaveProperty("erro");
  });
});

describe("calcularColunasFormula", () => {
  it("calcula uma cadeia de colunas em ordem de documento", () => {
    const colunas: ColunaCalculo[] = [
      { id: "peso", titulo: "Peso", tipo: "NUMERO", repetivel: false },
      { id: "altura", titulo: "Altura", tipo: "NUMERO", repetivel: false },
      {
        id: "imc",
        titulo: "IMC",
        tipo: "CALCULADO",
        formula: "{Peso} / ({Altura} * {Altura})",
        repetivel: false,
      },
      {
        id: "classificacao",
        titulo: "Classificação IMC",
        tipo: "CALCULADO",
        formula: "{IMC} * 1",
        repetivel: false,
      },
    ];
    const brutos: Record<string, string> = { peso: "70", altura: "1.75" };
    const resultados = calcularColunasFormula(colunas, (id) => brutos[id]);

    const imc = resultados.get("imc");
    expect(imc && "valor" in imc && imc.valor).toBeCloseTo(22.857, 2);
    const classificacao = resultados.get("classificacao");
    expect(classificacao && "valor" in classificacao && classificacao.valor).toBeCloseTo(
      22.857,
      2,
    );
  });

  it("ignora colunas de campo repetível como origem de valor", () => {
    const colunas: ColunaCalculo[] = [
      { id: "peso", titulo: "Peso", tipo: "NUMERO", repetivel: true },
      {
        id: "imc",
        titulo: "IMC",
        tipo: "CALCULADO",
        formula: "{Peso} * 2",
        repetivel: false,
      },
    ];
    const resultados = calcularColunasFormula(colunas, () => "70");
    expect(resultados.get("imc")).toEqual({ erro: "Preencha Peso para calcular" });
  });

  it("valor ausente/vazio vira erro, não NaN", () => {
    const colunas: ColunaCalculo[] = [
      { id: "peso", titulo: "Peso", tipo: "NUMERO", repetivel: false },
      { id: "altura", titulo: "Altura", tipo: "NUMERO", repetivel: false },
      {
        id: "imc",
        titulo: "IMC",
        tipo: "CALCULADO",
        formula: "{Peso} / ({Altura} * {Altura})",
        repetivel: false,
      },
    ];
    const resultados = calcularColunasFormula(colunas, (id) =>
      id === "peso" ? "70" : "",
    );
    expect(resultados.get("imc")).toEqual({ erro: "Preencha Altura para calcular" });
  });
});

describe("validarFormulasDoExame", () => {
  const base: ColunaValidavel[] = [
    { titulo: "Peso", tipo: "NUMERO", repetivel: false },
    { titulo: "Altura", tipo: "NUMERO", repetivel: false },
  ];

  it("aceita fórmula válida referenciando colunas anteriores", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "IMC",
        tipo: "CALCULADO",
        formula: "{Peso} / ({Altura} * {Altura})",
        repetivel: false,
      },
    ];
    expect(validarFormulasDoExame(colunas)).toBeNull();
  });

  it("aceita encadeamento de calculadas", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      { titulo: "IMC", tipo: "CALCULADO", formula: "{Peso}/{Altura}", repetivel: false },
      {
        titulo: "Classificação",
        tipo: "CALCULADO",
        formula: "{IMC} * 1",
        repetivel: false,
      },
    ];
    expect(validarFormulasDoExame(colunas)).toBeNull();
  });

  it("rejeita fórmula vazia", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      { titulo: "IMC", tipo: "CALCULADO", formula: "", repetivel: false },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/precisa de uma fórmula/);
  });

  it("rejeita coluna calculada em campo repetível", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "IMC",
        tipo: "CALCULADO",
        formula: "{Peso}/{Altura}",
        repetivel: true,
      },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/múltiplas entradas/);
  });

  it("rejeita referência a coluna que vem depois (evita ciclo por construção)", () => {
    const colunas: ColunaValidavel[] = [
      { titulo: "IMC", tipo: "CALCULADO", formula: "{Peso}/{Altura}", repetivel: false },
      ...base,
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/não existe ou vem depois/);
  });

  it("rejeita auto-referência", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      { titulo: "IMC", tipo: "CALCULADO", formula: "{IMC} + 1", repetivel: false },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/não pode referenciar ela mesma/);
  });

  it("rejeita nomes duplicados entre colunas numéricas/calculadas", () => {
    const colunas: ColunaValidavel[] = [
      { titulo: "Peso", tipo: "NUMERO", repetivel: false },
      { titulo: "peso", tipo: "NUMERO", repetivel: false },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/nomes únicos/);
  });

  it("permite nomes duplicados em colunas não referenciáveis (TEXTO)", () => {
    const colunas: ColunaValidavel[] = [
      { titulo: "Observação", tipo: "TEXTO", repetivel: false },
      { titulo: "Observação", tipo: "TEXTO", repetivel: false },
    ];
    expect(validarFormulasDoExame(colunas)).toBeNull();
  });

  it("rejeita sintaxe inválida", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      { titulo: "IMC", tipo: "CALCULADO", formula: "{Peso} / ({Altura}", repetivel: false },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/erro de sintaxe/);
  });

  it("coluna calculada em campo não-repetível não bloqueia colunas repetíveis anteriores de serem ignoradas como referência", () => {
    const colunas: ColunaValidavel[] = [
      { titulo: "Peso", tipo: "NUMERO", repetivel: true },
      { titulo: "IMC", tipo: "CALCULADO", formula: "{Peso} * 2", repetivel: false },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/não existe ou vem depois/);
  });
});

describe("avaliarCondicaoOpcao", () => {
  it("avalia comparador menor-que", () => {
    const valores = new Map([[normalizarTitulo("IMC"), 17]]);
    expect(avaliarCondicaoOpcao("{IMC} < 18.5", valores)).toEqual({
      valor: true,
    });
  });

  it("avalia comparador maior-ou-igual sobre expressão aritmética", () => {
    const valores = new Map([
      [normalizarTitulo("Peso"), 70],
      [normalizarTitulo("Altura"), 1.75],
    ]);
    const resultado = avaliarCondicaoOpcao(
      "{Peso} / ({Altura} * {Altura}) >= 25",
      valores,
    );
    expect(resultado).toEqual({ valor: false });
  });

  it("suporta ==, != e comparadores de 2 caracteres sem espaço", () => {
    const valores = new Map([[normalizarTitulo("Nota"), 10]]);
    expect(avaliarCondicaoOpcao("{Nota}==10", valores)).toEqual({ valor: true });
    expect(avaliarCondicaoOpcao("{Nota}!=10", valores)).toEqual({ valor: false });
    expect(avaliarCondicaoOpcao("{Nota}<=10", valores)).toEqual({ valor: true });
  });

  it("retorna erro citando o campo faltando", () => {
    expect(avaliarCondicaoOpcao("{IMC} < 18.5", new Map())).toEqual({
      erro: "Preencha IMC para calcular",
    });
  });

  it("retorna erro sem comparador", () => {
    const valores = new Map([[normalizarTitulo("IMC"), 17]]);
    const resultado = avaliarCondicaoOpcao("{IMC} + 1", valores);
    expect(resultado).toHaveProperty("erro");
  });

  it("trata divisão por zero na condição", () => {
    const valores = new Map([
      [normalizarTitulo("Peso"), 70],
      [normalizarTitulo("Altura"), 0],
    ]);
    expect(avaliarCondicaoOpcao("{Peso} / {Altura} < 100", valores)).toEqual({
      erro: "Não foi possível calcular a condição (divisão por zero)",
    });
  });
});

describe("calcularColunas — opções automáticas de MULTIPLA_ESCOLHA", () => {
  const colunasBase: ColunaCalculo[] = [
    { id: "imc", titulo: "IMC", tipo: "NUMERO", repetivel: false },
  ];

  it("marca a opção cuja condição bate (seleção única)", () => {
    const colunas: ColunaCalculo[] = [
      ...colunasBase,
      {
        id: "classificacao",
        titulo: "Classificação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Baixo peso", "Normal", "Sobrepeso"],
        multiplaSelecao: false,
        opcoesCondicionais: [
          { opcao: "Baixo peso", formula: "{IMC} < 18.5" },
          { opcao: "Normal", formula: "{IMC} >= 18.5" },
          { opcao: "Sobrepeso", formula: "{IMC} >= 25" },
        ],
      },
    ];
    const { opcoesAutomaticas } = calcularColunas(colunas, (id) =>
      id === "imc" ? "17" : undefined,
    );
    expect(opcoesAutomaticas.get("classificacao")).toEqual({
      selecionadas: ["Baixo peso"],
      erros: {},
    });
  });

  it("seleção única: primeira opção da ordem vence quando duas condições batem", () => {
    const colunas: ColunaCalculo[] = [
      ...colunasBase,
      {
        id: "faixa",
        titulo: "Faixa",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["A", "B"],
        multiplaSelecao: false,
        opcoesCondicionais: [
          { opcao: "A", formula: "{IMC} < 30" },
          { opcao: "B", formula: "{IMC} < 40" },
        ],
      },
    ];
    const { opcoesAutomaticas } = calcularColunas(colunas, () => "20");
    expect(opcoesAutomaticas.get("faixa")?.selecionadas).toEqual(["A"]);
  });

  it("seleção múltipla: marca todas as opções cuja condição bate", () => {
    const colunas: ColunaCalculo[] = [
      ...colunasBase,
      {
        id: "riscos",
        titulo: "Riscos",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Baixo IMC", "IMC alto"],
        multiplaSelecao: true,
        opcoesCondicionais: [
          { opcao: "Baixo IMC", formula: "{IMC} < 30" },
          { opcao: "IMC alto", formula: "{IMC} > 10" },
        ],
      },
    ];
    const { opcoesAutomaticas } = calcularColunas(colunas, () => "20");
    expect(opcoesAutomaticas.get("riscos")?.selecionadas).toEqual([
      "Baixo IMC",
      "IMC alto",
    ]);
  });

  it("valor de origem ausente vira erro por opção, sem selecionar nada", () => {
    const colunas: ColunaCalculo[] = [
      ...colunasBase,
      {
        id: "classificacao",
        titulo: "Classificação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Baixo peso", "Normal"],
        multiplaSelecao: false,
        opcoesCondicionais: [
          { opcao: "Baixo peso", formula: "{IMC} < 18.5" },
          { opcao: "Normal", formula: "{IMC} >= 18.5" },
        ],
      },
    ];
    const { opcoesAutomaticas } = calcularColunas(colunas, () => undefined);
    const resultado = opcoesAutomaticas.get("classificacao");
    expect(resultado?.selecionadas).toEqual([]);
    expect(resultado?.erros["Baixo peso"]).toMatch(/Preencha IMC/);
    expect(resultado?.erros["Normal"]).toMatch(/Preencha IMC/);
  });

  it("colunas MULTIPLA_ESCOLHA sem opcoesCondicionais continuam de fora do resultado (seleção manual)", () => {
    const colunas: ColunaCalculo[] = [
      ...colunasBase,
      {
        id: "manual",
        titulo: "Observação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["A", "B"],
        multiplaSelecao: false,
        opcoesCondicionais: [],
      },
    ];
    const { opcoesAutomaticas } = calcularColunas(colunas, () => "20");
    expect(opcoesAutomaticas.has("manual")).toBe(false);
  });

  it("calcularColunasFormula continua funcionando (só CALCULADO)", () => {
    const colunas: ColunaCalculo[] = [
      { id: "peso", titulo: "Peso", tipo: "NUMERO", repetivel: false },
      {
        id: "dobro",
        titulo: "Dobro",
        tipo: "CALCULADO",
        formula: "{Peso} * 2",
        repetivel: false,
      },
    ];
    const resultados = calcularColunasFormula(colunas, () => "10");
    expect(resultados.get("dobro")).toEqual({ valor: 20 });
  });
});

describe("parseOpcoesCondicionais", () => {
  it("aceita array válido vindo do Prisma (Json)", () => {
    const valor: unknown = [{ opcao: "A", formula: "{X} < 1" }];
    expect(parseOpcoesCondicionais(valor)).toEqual([
      { opcao: "A", formula: "{X} < 1" },
    ]);
  });

  it("trata null/undefined/formato inesperado como nenhuma condição", () => {
    expect(parseOpcoesCondicionais(null)).toEqual([]);
    expect(parseOpcoesCondicionais(undefined)).toEqual([]);
    expect(parseOpcoesCondicionais("legado")).toEqual([]);
    expect(parseOpcoesCondicionais([{ opcao: "A" }])).toEqual([]);
  });
});

describe("validarFormulasDoExame — opções automáticas de MULTIPLA_ESCOLHA", () => {
  const base: ColunaValidavel[] = [
    { titulo: "IMC", tipo: "NUMERO", repetivel: false },
  ];

  it("aceita quando todas as opções têm condição válida", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "Classificação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Baixo peso", "Normal"],
        opcoesCondicionais: [
          { opcao: "Baixo peso", formula: "{IMC} < 18.5" },
          { opcao: "Normal", formula: "{IMC} >= 18.5" },
        ],
      },
    ];
    expect(validarFormulasDoExame(colunas)).toBeNull();
  });

  it("rejeita quando só parte das opções tem condição", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "Classificação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Baixo peso", "Normal"],
        opcoesCondicionais: [{ opcao: "Baixo peso", formula: "{IMC} < 18.5" }],
      },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/TODAS as opções/);
  });

  it("rejeita condição referenciando coluna que vem depois", () => {
    const colunas: ColunaValidavel[] = [
      {
        titulo: "Classificação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Baixo peso"],
        opcoesCondicionais: [{ opcao: "Baixo peso", formula: "{IMC} < 18.5" }],
      },
      ...base,
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/não existe ou vem depois/);
  });

  it("rejeita condição sem comparador (erro de sintaxe)", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "Classificação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Baixo peso"],
        opcoesCondicionais: [{ opcao: "Baixo peso", formula: "{IMC} + 1" }],
      },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/erro de sintaxe/);
  });

  it("rejeita auto-referência na condição", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "Classificação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Baixo peso"],
        opcoesCondicionais: [
          { opcao: "Baixo peso", formula: "{Classificação} < 1" },
        ],
      },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/não pode referenciar a própria coluna/);
  });

  it("coluna manual (sem opcoesCondicionais) não é afetada", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "Observação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["A", "B"],
        opcoesCondicionais: [],
      },
    ];
    expect(validarFormulasDoExame(colunas)).toBeNull();
  });
});

describe("formatarNumeroFormula", () => {
  it("arredonda para 2 casas sem zero à toa", () => {
    expect(formatarNumeroFormula(22.85714)).toBe("22.86");
    expect(formatarNumeroFormula(10)).toBe("10");
    expect(formatarNumeroFormula(10.5)).toBe("10.5");
  });
});
