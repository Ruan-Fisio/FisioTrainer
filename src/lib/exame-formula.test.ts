import { describe, expect, it } from "vitest";
import {
  avaliarCondicaoOpcao,
  avaliarFormula,
  calcularColunas,
  calcularColunasFormula,
  calcularLinhasRepetiveis,
  chaveLinha,
  extrairReferencias,
  expandirVariaveis,
  formatarNumeroFormula,
  parseVariaveis,
  validarFormulasDoExameDetalhado,
  normalizarTitulo,
  parseOpcoesCondicionais,
  renomearReferenciaFormula,
  validarFormulasDoExame,
  type ColunaCalculo,
  type ColunaValidavel,
  type DadosPacienteFormula,
  type VariavelExame,
} from "./exame-formula";
import { serializeSelecionadas } from "./multipla-escolha";

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
    expect(resultado).toEqual({ valor: 22.9 });
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
    expect(resultado).toEqual({ valor: 45.7 });
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
    expect(imc).toEqual({ valor: 22.9 });
    const classificacao = resultados.get("classificacao");
    expect(classificacao).toEqual({ valor: 22.9 });
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

  it("aceita coluna calculada em campo repetível referenciando colunas do exame", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "IMC",
        tipo: "CALCULADO",
        formula: "{Peso}/{Altura}",
        repetivel: true,
        campoId: "c1",
      },
    ];
    expect(validarFormulasDoExame(colunas)).toBeNull();
  });

  it("aceita referência a coluna que vem depois (ordem dos campos não importa)", () => {
    const colunas: ColunaValidavel[] = [
      { titulo: "IMC", tipo: "CALCULADO", formula: "{Peso}/{Altura}", repetivel: false },
      ...base,
    ];
    expect(validarFormulasDoExame(colunas)).toBeNull();
  });

  it("rejeita ciclo entre colunas calculadas", () => {
    const colunas: ColunaValidavel[] = [
      { titulo: "A", tipo: "CALCULADO", formula: "{B} + 1", repetivel: false },
      { titulo: "B", tipo: "CALCULADO", formula: "{A} + 1", repetivel: false },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/ciclo/);
  });

  it("rejeita referência a coluna inexistente", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      { titulo: "X", tipo: "CALCULADO", formula: "{Peso} * {Nada}", repetivel: false },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/que não existe/);
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

  it("coluna de campo repetível não pode ser referenciada", () => {
    const colunas: ColunaValidavel[] = [
      { titulo: "Peso", tipo: "NUMERO", repetivel: true },
      { titulo: "IMC", tipo: "CALCULADO", formula: "{Peso} * 2", repetivel: false },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/que não existe/);
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

  describe("com && (E lógico, faixa mínimo/máximo)", () => {
    it("verdadeiro só quando as duas cláusulas batem", () => {
      const dentro = new Map([[normalizarTitulo("IMC"), 12]]);
      const fora = new Map([[normalizarTitulo("IMC"), 20]]);
      expect(
        avaliarCondicaoOpcao("{IMC} < 16 && {IMC} > 10", dentro),
      ).toEqual({ valor: true });
      expect(
        avaliarCondicaoOpcao("{IMC} < 16 && {IMC} > 10", fora),
      ).toEqual({ valor: false });
    });

    it("no limite exato de uma cláusula com <=/>=", () => {
      const valores = new Map([[normalizarTitulo("IMC"), 16]]);
      expect(
        avaliarCondicaoOpcao("{IMC} <= 16 && {IMC} > 10", valores),
      ).toEqual({ valor: true });
      expect(
        avaliarCondicaoOpcao("{IMC} < 16 && {IMC} > 10", valores),
      ).toEqual({ valor: false });
    });

    it("suporta mais de duas cláusulas encadeadas", () => {
      const valores = new Map([
        [normalizarTitulo("IMC"), 22],
        [normalizarTitulo("Idade"), 30],
      ]);
      expect(
        avaliarCondicaoOpcao(
          "{IMC} >= 18.5 && {IMC} < 25 && {Idade} >= 18",
          valores,
        ),
      ).toEqual({ valor: true });
    });

    it("propaga erro (campo faltando) de qualquer cláusula", () => {
      const valores = new Map([[normalizarTitulo("IMC"), 12]]);
      expect(
        avaliarCondicaoOpcao("{IMC} < 16 && {Idade} > 10", valores),
      ).toEqual({ erro: "Preencha Idade para calcular" });
    });

    it("&& não confunde com os comparadores existentes (<=, >=, ==, !=)", () => {
      const valores = new Map([[normalizarTitulo("Nota"), 10]]);
      expect(
        avaliarCondicaoOpcao("{Nota} >= 5 && {Nota} <= 10", valores),
      ).toEqual({ valor: true });
    });
  });

  describe("intervalo (entre A e B)", () => {
    const com = (imc: number) => new Map([[normalizarTitulo("IMC"), imc]]);

    it("limites inclusivos", () => {
      expect(avaliarCondicaoOpcao("{IMC} entre 1.0 e 2.0", com(1))).toEqual({ valor: true });
      expect(avaliarCondicaoOpcao("{IMC} entre 1.0 e 2.0", com(1.5))).toEqual({ valor: true });
      expect(avaliarCondicaoOpcao("{IMC} entre 1.0 e 2.0", com(2))).toEqual({ valor: true });
      expect(avaliarCondicaoOpcao("{IMC} entre 1.0 e 2.0", com(2.1))).toEqual({ valor: false });
      expect(avaliarCondicaoOpcao("{IMC} entre 1.0 e 2.0", com(0.9))).toEqual({ valor: false });
    });

    it("aceita 'dentro de' e qualquer caixa", () => {
      expect(avaliarCondicaoOpcao("{IMC} dentro de 1 e 2", com(1.5))).toEqual({ valor: true });
      expect(avaliarCondicaoOpcao("{IMC} ENTRE 1 E 2", com(3))).toEqual({ valor: false });
    });

    it("extremos invertidos formam a mesma faixa", () => {
      expect(avaliarCondicaoOpcao("{IMC} entre 2 e 1", com(1.5))).toEqual({ valor: true });
    });

    it("aceita expressões, negativos e limites com variável", () => {
      const valores = new Map([
        [normalizarTitulo("IMC"), 20],
        [normalizarTitulo("Idade"), 30],
      ]);
      expect(avaliarCondicaoOpcao("{IMC} entre {Idade} - 15 e {Idade} - 5", valores)).toEqual({
        valor: true,
      });
      expect(avaliarCondicaoOpcao("({IMC} - 40) entre -25 e -15", valores)).toEqual({
        valor: true,
      });
    });

    it("combina com && e com comparadores", () => {
      const valores = new Map([
        [normalizarTitulo("IMC"), 22],
        [normalizarTitulo("Idade"), 30],
      ]);
      expect(
        avaliarCondicaoOpcao("{IMC} entre 18.5 e 24.9 && {Idade} >= 18", valores),
      ).toEqual({ valor: true });
      expect(
        avaliarCondicaoOpcao("{IMC} entre 25 e 30 && {Idade} >= 18", valores),
      ).toEqual({ valor: false });
    });

    it("funciona dentro de SE (o ';' dos limites não existe, só 'e')", () => {
      const valores = new Map([[normalizarTitulo("IMC"), 22]]);
      expect(
        avaliarFormula("SE({IMC} entre 18 e 25; 1; 2)", valores),
      ).toEqual({ valor: 1 });
    });

    it("erro sem o 'e' ou com limite inválido", () => {
      expect(avaliarCondicaoOpcao("{IMC} entre 1", com(1))).toHaveProperty("erro");
      expect(avaliarCondicaoOpcao("{IMC} entre e 2", com(1))).toHaveProperty("erro");
    });

    it("citando o campo faltando", () => {
      expect(avaliarCondicaoOpcao("{IMC} entre 1 e 2", new Map())).toEqual({
        erro: "Preencha IMC para calcular",
      });
    });

    it("validação do cadastro aceita a sintaxe", () => {
      const colunas: ColunaValidavel[] = [
        { titulo: "IMC", tipo: "NUMERO", repetivel: false },
        {
          titulo: "Classe",
          tipo: "MULTIPLA_ESCOLHA",
          repetivel: false,
          opcoes: ["Normal", "Outro"],
          opcoesCondicionais: [
            { opcao: "Normal", formula: "{IMC} entre 18.5 e 24.9" },
            { opcao: "Outro", formula: "{IMC} < 18.5 && {IMC} > 24.9" },
          ],
        },
      ];
      expect(validarFormulasDoExame(colunas)).toBeNull();
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

  it("aceita condição referenciando coluna que vem depois", () => {
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
    expect(validarFormulasDoExame(colunas)).toBeNull();
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

  it("aceita condição de faixa com && (mínimo e máximo)", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "Classificação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Magreza grau III"],
        opcoesCondicionais: [
          { opcao: "Magreza grau III", formula: "{IMC} < 16 && {IMC} > 10" },
        ],
      },
    ];
    expect(validarFormulasDoExame(colunas)).toBeNull();
  });

  it("rejeita && com cláusula incompleta (erro de sintaxe)", () => {
    const colunas: ColunaValidavel[] = [
      ...base,
      {
        titulo: "Classificação",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["Baixo peso"],
        opcoesCondicionais: [
          { opcao: "Baixo peso", formula: "{IMC} < 16 && " },
        ],
      },
    ];
    expect(validarFormulasDoExame(colunas)).toMatch(/erro de sintaxe/);
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

describe("variáveis do paciente ({Idade}, {Sexo})", () => {
  const colunas = [
    { id: "peso", titulo: "Peso", tipo: "NUMERO", repetivel: false },
    {
      id: "calc",
      titulo: "Ajustado",
      tipo: "CALCULADO",
      formula: "{Peso} + {Idade} + {Sexo} * 10",
      repetivel: false,
    },
    {
      id: "faixa",
      titulo: "Faixa",
      tipo: "MULTIPLA_ESCOLHA",
      repetivel: false,
      opcoes: ["Idoso", "Adulto"],
      multiplaSelecao: false,
      opcoesCondicionais: [
        { opcao: "Idoso", formula: "{Idade} >= 60" },
        { opcao: "Adulto", formula: "{Idade} < 60" },
      ],
    },
  ];
  const bruto = (id: string) => (id === "peso" ? "70" : undefined);

  it("usa idade e sexo do paciente em CALCULADO e em condições", () => {
    const r = calcularColunas(colunas, bruto, { idade: 65, sexo: "MASCULINO" });
    expect(r.calculados.get("calc")).toEqual({ valor: 145 });
    expect(r.opcoesAutomaticas.get("faixa")?.selecionadas).toEqual(["Idoso"]);
    const f = calcularColunas(colunas, bruto, { idade: 30, sexo: "FEMININO" });
    expect(f.calculados.get("calc")).toEqual({ valor: 100 });
  });

  it("pede o dado quando o paciente não tem idade/sexo", () => {
    const r = calcularColunas(colunas, bruto, { idade: null, sexo: null });
    expect(r.calculados.get("calc")).toEqual({ erro: "Preencha Idade e Sexo para calcular" });
  });

  it("validação aceita as variáveis e coluna com o mesmo nome continua válida", () => {
    expect(
      validarFormulasDoExame([
        { titulo: "Peso", tipo: "NUMERO", repetivel: false },
        { titulo: "X", tipo: "CALCULADO", formula: "{Peso} * {Idade}", repetivel: false },
      ]),
    ).toBeNull();
    expect(
      validarFormulasDoExame([
        { titulo: "Idade", tipo: "NUMERO", repetivel: false },
        { titulo: "X", tipo: "CALCULADO", formula: "{Idade} * 2", repetivel: false },
      ]),
    ).toBeNull();
  });

  it("coluna com nome Idade tem precedência sobre o perfil", () => {
    const r = calcularColunas(
      [
        { id: "i", titulo: "Idade", tipo: "NUMERO", repetivel: false },
        { id: "x", titulo: "X", tipo: "CALCULADO", formula: "{Idade} * 2", repetivel: false },
      ],
      (id) => (id === "i" ? "10" : undefined),
      { idade: 50 },
    );
    expect(r.calculados.get("x")).toEqual({ valor: 20 });
  });
});

describe("SE(condição; verdadeiro; falso)", () => {
  const v = (o: Record<string, number>) => new Map(Object.entries(o));
  it("escolhe o ramo conforme a condição", () => {
    const f = "SE({sexo} == 1; {peso} * 2; {peso} * 3)";
    expect(avaliarFormula(f, v({ sexo: 1, peso: 10 }))).toEqual({ valor: 20 });
    expect(avaliarFormula(f, v({ sexo: 0, peso: 10 }))).toEqual({ valor: 30 });
  });
  it("aceita && na condição, SE aninhado e uso dentro de expressão", () => {
    const f = "1 + SE({i} > 10 && {i} < 20; 5; SE({i} >= 20; 7; 9))";
    expect(avaliarFormula(f, v({ i: 15 }))).toEqual({ valor: 6 });
    expect(avaliarFormula(f, v({ i: 25 }))).toEqual({ valor: 8 });
    expect(avaliarFormula(f, v({ i: 5 }))).toEqual({ valor: 10 });
  });
  it("valida sintaxe: argumentos faltando e ramo inválido", () => {
    const col = (formula: string) => [
      { titulo: "A", tipo: "NUMERO", repetivel: false },
      { titulo: "X", tipo: "CALCULADO", formula, repetivel: false },
    ];
    expect(validarFormulasDoExame(col("SE({A} > 1; 2; 3)"))).toBeNull();
    expect(validarFormulasDoExame(col("SE({A} > 1; 2)"))).toMatch(/sintaxe/);
    expect(validarFormulasDoExame(col("SE({A} > 1; 2; 3 +)"))).toMatch(/sintaxe/);
    expect(validarFormulasDoExame(col("SE({A}; 2; 3)"))).toMatch(/sintaxe/);
  });
});

describe("variáveis do exame", () => {
  const colunas = [
    { id: "a", titulo: "Tríceps", tipo: "NUMERO", repetivel: false },
    { id: "b", titulo: "Subescapular", tipo: "NUMERO", repetivel: false },
    { id: "r", titulo: "Resultado", tipo: "CALCULADO", formula: "{Soma} * {Fator}", repetivel: false },
  ];
  const variaveis = [
    { nome: "Soma", formula: "{Tríceps} + {Subescapular}" },
    { nome: "Fator", formula: "0.5" },
  ];
  const bruto = (id: string) => ({ a: "10", b: "20" })[id as "a" | "b"];

  it("expande constantes e sub-fórmulas (inclusive encadeadas)", () => {
    expect(expandirVariaveis("{Soma} * {Fator}", variaveis)).toBe(
      "({Tríceps} + {Subescapular}) * (0.5)",
    );
    expect(
      expandirVariaveis("{B}", [
        { nome: "A", formula: "2" },
        { nome: "B", formula: "{A} * 3" },
      ]),
    ).toBe("((2) * 3)");
  });

  it("calcularColunas usa as variáveis em CALCULADO e em condições", () => {
    const r = calcularColunas(colunas, bruto, null, variaveis);
    expect(r.calculados.get("r")).toEqual({ valor: 15 });
    const c = calcularColunas(
      [
        ...colunas.slice(0, 2),
        {
          id: "m",
          titulo: "Faixa",
          tipo: "MULTIPLA_ESCOLHA",
          repetivel: false,
          opcoes: ["Alta", "Baixa"],
          opcoesCondicionais: [
            { opcao: "Alta", formula: "{Soma} > 25" },
            { opcao: "Baixa", formula: "{Soma} <= 25" },
          ],
        },
      ],
      bruto,
      null,
      variaveis,
    );
    expect(c.opcoesAutomaticas.get("m")?.selecionadas).toEqual(["Alta"]);
  });

  it("cadastro aceita variáveis válidas", () => {
    expect(validarFormulasDoExame(colunas, variaveis)).toBeNull();
  });

  it("barra nome vazio, duplicado, em conflito, ciclo, referência inexistente e sintaxe", () => {
    const v = (vs: { nome: string; formula: string }[]) => validarFormulasDoExame(colunas, vs);
    expect(v([{ nome: " ", formula: "1" }])).toMatch(/precisa de um nome/);
    expect(v([{ nome: "A", formula: "1" }, { nome: "a", formula: "2" }])).toMatch(/Já existe/);
    expect(v([{ nome: "Idade", formula: "1" }])).toMatch(/do paciente/);
    expect(v([{ nome: "tríceps", formula: "1" }])).toMatch(/nome de uma coluna/);
    expect(v([{ nome: "A", formula: "{B}" }, { nome: "B", formula: "{A}" }])).toMatch(/ciclo/);
    expect(v([{ nome: "A", formula: "{Nada}" }])).toMatch(/não existe/);
    expect(v([{ nome: "A", formula: "1 +" }])).toMatch(/sintaxe/);
    expect(v([{ nome: "A", formula: "" }])).toMatch(/precisa de uma fórmula/);
  });

  it("erro de variável aponta variavelIndex", () => {
    const erro = validarFormulasDoExameDetalhado(colunas, [
      { nome: "Ok", formula: "1" },
      { nome: "Ruim", formula: "" },
    ]);
    expect(erro).toMatchObject({ colunaIndex: -1, variavelIndex: 1 });
  });

  it("parseVariaveis ignora formato inesperado", () => {
    expect(parseVariaveis(null)).toEqual([]);
    expect(parseVariaveis([{ nome: "A", formula: "1" }, { nome: 2 }, "x"])).toEqual([
      { nome: "A", formula: "1" },
    ]);
  });
});

describe("potência (^)", () => {
  const vazio = new Map<string, number>();
  const calc = (f: string, v = vazio) => avaliarFormula(f, v);
  it("eleva ao quadrado, com variável e precedência sobre * e /", () => {
    expect(calc("{h} ^ 2", new Map([["h", 3]]))).toEqual({ valor: 9 });
    expect(calc("{p} / {h} ^ 2", new Map([["p", 80], ["h", 2]]))).toEqual({ valor: 20 });
    expect(calc("2 * 3 ^ 2")).toEqual({ valor: 18 });
  });
  it("associa à direita, aceita sinal no expoente e ** equivale a ^", () => {
    expect(calc("2 ^ 3 ^ 2")).toEqual({ valor: 512 });
    expect(calc("2 ^ -1")).toEqual({ valor: 0.5 });
    expect(calc("-2 ^ 2")).toEqual({ valor: -4 });
    expect(calc("(-2) ^ 2")).toEqual({ valor: 4 });
    expect(calc("2 ** 3")).toEqual({ valor: 8 });
  });
  it("resultado inválido vira erro, não NaN", () => {
    expect("erro" in calc("(-8) ^ 0.5")).toBe(true);
  });
  it("valida sintaxe de ^ incompleto", () => {
    expect(
      validarFormulasDoExame([
        { titulo: "A", tipo: "NUMERO", repetivel: false },
        { titulo: "X", tipo: "CALCULADO", formula: "{A} ^", repetivel: false },
      ]),
    ).toMatch(/sintaxe/);
  });
});

describe("referência a colunas em qualquer ordem", () => {
  const colunas: ColunaCalculo[] = [
    { id: "imc", titulo: "IMC", tipo: "CALCULADO", formula: "{Peso} / ({Altura} * {Altura})", repetivel: false },
    { id: "classe", titulo: "Dobro", tipo: "CALCULADO", formula: "{IMC} * 2", repetivel: false },
    {
      id: "faixa",
      titulo: "Faixa",
      tipo: "MULTIPLA_ESCOLHA",
      repetivel: false,
      opcoes: ["Alto", "Baixo"],
      opcoesCondicionais: [
        { opcao: "Alto", formula: "{IMC} >= 25" },
        { opcao: "Baixo", formula: "{IMC} < 25" },
      ],
    },
    { id: "peso", titulo: "Peso", tipo: "NUMERO", repetivel: false },
    { id: "altura", titulo: "Altura", tipo: "NUMERO", repetivel: false },
  ];
  const bruto = (id: string) => ({ peso: "100", altura: "2" })[id as "peso" | "altura"];

  it("calcula calculadas e opções automáticas que dependem de colunas posteriores", () => {
    const r = calcularColunas(colunas, bruto);
    expect(r.calculados.get("imc")).toEqual({ valor: 25 });
    expect(r.calculados.get("classe")).toEqual({ valor: 50 });
    expect(r.opcoesAutomaticas.get("faixa")?.selecionadas).toEqual(["Alto"]);
  });

  it("ciclo não trava: as colunas do ciclo ficam sem valor", () => {
    const r = calcularColunas(
      [
        { id: "a", titulo: "A", tipo: "CALCULADO", formula: "{B} + 1", repetivel: false },
        { id: "b", titulo: "B", tipo: "CALCULADO", formula: "{A} + 1", repetivel: false },
      ],
      () => undefined,
    );
    expect("erro" in r.calculados.get("a")!).toBe(true);
    expect("erro" in r.calculados.get("b")!).toBe(true);
  });
});

describe("pontuação por opção de MULTIPLA_ESCOLHA", () => {
  const escala = [
    { opcao: "Nunca", pontos: 0 },
    { opcao: "Às vezes", pontos: 1 },
    { opcao: "Sempre", pontos: 3 },
  ];
  const item = (id: string, extra: Partial<ColunaCalculo> = {}): ColunaCalculo => ({
    id,
    titulo: id.toUpperCase(),
    tipo: "MULTIPLA_ESCOLHA",
    repetivel: false,
    opcoes: ["Nunca", "Às vezes", "Sempre"],
    pontuacoes: escala,
    ...extra,
  });
  const total: ColunaCalculo = {
    id: "total",
    titulo: "Total",
    tipo: "CALCULADO",
    formula: "{Q1} + {Q2}",
    repetivel: false,
  };
  const calc = (id: string, titulo: string, formula: string): ColunaCalculo => ({
    id,
    titulo,
    tipo: "CALCULADO",
    formula,
    repetivel: false,
  });
  const peso: ColunaCalculo = { id: "peso", titulo: "Peso", tipo: "NUMERO", repetivel: false };
  const risco: ColunaCalculo = {
    id: "risco",
    titulo: "Risco",
    tipo: "MULTIPLA_ESCOLHA",
    repetivel: false,
    opcoes: ["Baixo", "Alto"],
    pontuacoes: [
      { opcao: "Baixo", pontos: 1 },
      { opcao: "Alto", pontos: 10 },
    ],
    opcoesCondicionais: [
      { opcao: "Baixo", formula: "{Peso} < 100" },
      { opcao: "Alto", formula: "{Peso} >= 100" },
    ],
  };

  it("CALCULADO soma as pontuações das opções marcadas", () => {
    const valores: Record<string, string> = { q1: "Sempre", q2: "Às vezes" };
    const r = calcularColunas([item("q1"), item("q2"), total], (id) => valores[id]);
    expect(r.calculados.get("total")).toEqual({ valor: 4 });
  });

  it("nenhuma opção marcada = sem valor: a fórmula pede o preenchimento", () => {
    const valores: Record<string, string> = { q1: "Sempre" };
    const r = calcularColunas([item("q1"), item("q2"), total], (id) => valores[id]);
    expect(r.calculados.get("total")).toEqual({ erro: "Preencha Q2 para calcular" });
  });

  it("opção de pontuação 0 conta como respondida", () => {
    const valores: Record<string, string> = { q1: "Nunca", q2: "Nunca" };
    const r = calcularColunas([item("q1"), item("q2"), total], (id) => valores[id]);
    expect(r.calculados.get("total")).toEqual({ valor: 0 });
  });

  it("seleção múltipla vale a soma das opções marcadas", () => {
    const multi = item("q1", { multiplaSelecao: true });
    const valor = serializeSelecionadas(["Às vezes", "Sempre"]);
    const r = calcularColunas([multi, calc("t", "T", "{Q1} * 2")], (id) =>
      id === "q1" ? valor : undefined,
    );
    expect(r.calculados.get("t")).toEqual({ valor: 8 });
  });

  it("opção com vírgula no texto é encontrada (sem split por vírgula)", () => {
    const col = item("q1", {
      opcoes: ["Leve, ocasional", "Grave"],
      pontuacoes: [
        { opcao: "Leve, ocasional", pontos: 2 },
        { opcao: "Grave", pontos: 5 },
      ],
    });
    const r = calcularColunas([col, calc("t", "T", "{Q1}")], (id) =>
      id === "q1" ? "Leve, ocasional" : undefined,
    );
    expect(r.calculados.get("t")).toEqual({ valor: 2 });
  });

  it("encadeia: pontuações → total → classificação automática (qualquer ordem)", () => {
    const classificacao: ColunaCalculo = {
      id: "classe",
      titulo: "Classificação",
      tipo: "MULTIPLA_ESCOLHA",
      repetivel: false,
      opcoes: ["Leve", "Grave"],
      opcoesCondicionais: [
        { opcao: "Leve", formula: "{Total} < 4" },
        { opcao: "Grave", formula: "{Total} >= 4" },
      ],
    };
    const valores: Record<string, string> = { q1: "Sempre", q2: "Às vezes" };
    const r = calcularColunas(
      [classificacao, item("q1"), item("q2"), total],
      (id) => valores[id],
    );
    expect(r.opcoesAutomaticas.get("classe")?.selecionadas).toEqual(["Grave"]);
  });

  it("coluna de pontuação automática é resolvida sob demanda e vira número", () => {
    const r = calcularColunas(
      [calc("dobro", "Dobro", "{Risco} * 2"), risco, peso],
      (id) => (id === "peso" ? "120" : undefined),
    );
    expect(r.opcoesAutomaticas.get("risco")?.selecionadas).toEqual(["Alto"]);
    expect(r.calculados.get("dobro")).toEqual({ valor: 20 });
  });

  it("coluna automática com valor de origem faltando não entrega pontuação", () => {
    const r = calcularColunas(
      [peso, risco, calc("dobro", "Dobro", "{Risco} * 2")],
      () => undefined,
    );
    expect(r.calculados.get("dobro")).toEqual({ erro: "Preencha Risco para calcular" });
  });

  it("coluna sem pontuação continua sem ser referenciável", () => {
    const r = calcularColunas(
      [item("q1", { pontuacoes: [] }), calc("t", "T", "{Q1}")],
      (id) => (id === "q1" ? "Sempre" : undefined),
    );
    expect(r.calculados.get("t")).toEqual({ erro: "Preencha Q1 para calcular" });
  });

  describe("validação", () => {
    const col = (extra: Partial<ColunaValidavel>): ColunaValidavel => ({
      titulo: "Q1",
      tipo: "MULTIPLA_ESCOLHA",
      repetivel: false,
      opcoes: ["Nunca", "Sempre"],
      pontuacoes: [
        { opcao: "Nunca", pontos: 0 },
        { opcao: "Sempre", pontos: 3 },
      ],
      ...extra,
    });
    const soma = (formula: string): ColunaValidavel => ({
      titulo: "Total",
      tipo: "CALCULADO",
      formula,
      repetivel: false,
    });

    it("fórmula pode referenciar coluna de pontuação", () => {
      expect(validarFormulasDoExame([col({}), soma("{Q1} * 2")])).toBeNull();
    });

    it("coluna sem pontuação não existe para a fórmula", () => {
      const erro = validarFormulasDoExame([col({ pontuacoes: [] }), soma("{Q1} * 2")]);
      expect(erro).toContain('referencia "Q1"');
    });

    it("exige pontos numéricos em todas as opções, apontando a opção", () => {
      const erro = validarFormulasDoExameDetalhado([
        col({
          pontuacoes: [
            { opcao: "Nunca", pontos: 0 },
            { opcao: "Sempre", pontos: Number.NaN },
          ],
        }),
      ]);
      expect(erro?.mensagem).toContain('"Sempre"');
      expect(erro?.opcaoIndex).toBe(1);
      expect(erro?.opcaoCampo).toBe("pontuacoes");
    });

    it("barra pontuação em campo repetível", () => {
      expect(validarFormulasDoExame([col({ repetivel: true })])).toContain(
        "múltiplas entradas",
      );
    });

    it("nome da coluna de pontuação é único entre as referenciáveis", () => {
      const erro = validarFormulasDoExame([
        col({}),
        { titulo: "Q1", tipo: "NUMERO", repetivel: false },
      ]);
      expect(erro).toContain('Já existe uma coluna numérica chamada "Q1"');
    });

    it("barra ciclo passando por coluna de pontuação automática", () => {
      const automatica = col({
        titulo: "Risco",
        opcoes: ["Baixo", "Alto"],
        pontuacoes: [
          { opcao: "Baixo", pontos: 1 },
          { opcao: "Alto", pontos: 2 },
        ],
        opcoesCondicionais: [
          { opcao: "Baixo", formula: "{Dobro} < 5" },
          { opcao: "Alto", formula: "{Dobro} >= 5" },
        ],
      });
      const dobro: ColunaValidavel = {
        titulo: "Dobro",
        tipo: "CALCULADO",
        formula: "{Risco} * 2",
        repetivel: false,
      };
      expect(validarFormulasDoExame([automatica, dobro])).toContain("ciclo");
    });
  });
});

describe("{Soma pontuações} — soma global das colunas de pontuação", () => {
  const pontuada = (
    id: string,
    pontos: [number, number],
    extra: Partial<ColunaCalculo> = {},
  ): ColunaCalculo => ({
    id,
    titulo: `Item ${id}`,
    tipo: "MULTIPLA_ESCOLHA",
    repetivel: false,
    opcoes: ["Não", "Sim"],
    pontuacoes: [
      { opcao: "Não", pontos: pontos[0] },
      { opcao: "Sim", pontos: pontos[1] },
    ],
    ...extra,
  });
  const calc = (formula: string, id = "total", titulo = "Total"): ColunaCalculo => ({
    id,
    titulo,
    tipo: "CALCULADO",
    formula,
    repetivel: false,
  });

  it("soma os pontos das opções marcadas em todas as colunas de pontuação", () => {
    const valores: Record<string, string> = { a: "Sim", b: "Sim", c: "Não" };
    const r = calcularColunas(
      [pontuada("a", [0, 2]), pontuada("b", [0, 3]), pontuada("c", [0, 4]), calc("{Soma pontuações}")],
      (id) => valores[id],
    );
    expect(r.calculados.get("total")).toEqual({ valor: 5 });
    expect(r.somaPontuacoes).toBe(5);
  });

  it("aceita o nome sem acento e em qualquer caixa", () => {
    const r = calcularColunas(
      [pontuada("a", [0, 2]), calc("{soma pontuacoes} * 10")],
      (id) => (id === "a" ? "Sim" : undefined),
    );
    expect(r.calculados.get("total")).toEqual({ valor: 20 });
  });

  it("coluna sem resposta conta como 0 (soma só as respondidas)", () => {
    const r = calcularColunas(
      [pontuada("a", [0, 2]), pontuada("b", [0, 3]), calc("{Soma pontuações}")],
      (id) => (id === "a" ? "Sim" : undefined),
    );
    expect(r.calculados.get("total")).toEqual({ valor: 2 });
  });

  it("nenhuma coluna respondida = sem valor", () => {
    const r = calcularColunas(
      [pontuada("a", [0, 2]), calc("{Soma pontuações}")],
      () => undefined,
    );
    expect(r.calculados.get("total")).toEqual({
      erro: "Preencha Soma pontuações para calcular",
    });
    expect(r.somaPontuacoes).toBeUndefined();
  });

  it("seleção múltipla entra na soma global", () => {
    const multi = pontuada("a", [1, 2], { multiplaSelecao: true });
    const valor = serializeSelecionadas(["Não", "Sim"]);
    const r = calcularColunas([multi, calc("{Soma pontuações}")], (id) =>
      id === "a" ? valor : undefined,
    );
    expect(r.calculados.get("total")).toEqual({ valor: 3 });
  });

  it("classificação automática usa a soma (e vem antes das colunas na ordem)", () => {
    const classe: ColunaCalculo = {
      id: "classe",
      titulo: "Classificação",
      tipo: "MULTIPLA_ESCOLHA",
      repetivel: false,
      opcoes: ["Baixo", "Alto"],
      opcoesCondicionais: [
        { opcao: "Baixo", formula: "{Soma pontuações} < 5" },
        { opcao: "Alto", formula: "{Soma pontuações} >= 5" },
      ],
    };
    const valores: Record<string, string> = { a: "Sim", b: "Sim" };
    const r = calcularColunas(
      [classe, pontuada("a", [0, 2]), pontuada("b", [0, 3])],
      (id) => valores[id],
    );
    expect(r.opcoesAutomaticas.get("classe")?.selecionadas).toEqual(["Alto"]);
  });

  it("inclui colunas de pontuação automáticas, resolvidas sob demanda", () => {
    const peso: ColunaCalculo = { id: "peso", titulo: "Peso", tipo: "NUMERO", repetivel: false };
    const risco = pontuada("r", [1, 10], {
      titulo: "Risco",
      opcoes: ["Não", "Sim"],
      opcoesCondicionais: [
        { opcao: "Não", formula: "{Peso} < 100" },
        { opcao: "Sim", formula: "{Peso} >= 100" },
      ],
    });
    const valores: Record<string, string> = { peso: "120", a: "Sim" };
    const r = calcularColunas(
      [calc("{Soma pontuações}"), risco, peso, pontuada("a", [0, 2])],
      (id) => valores[id],
    );
    expect(r.calculados.get("total")).toEqual({ valor: 12 });
  });

  it("não conta colunas de campo repetível", () => {
    const r = calcularColunas(
      [pontuada("a", [0, 2]), pontuada("b", [0, 50], { repetivel: true }), calc("{Soma pontuações}")],
      () => "Sim",
    );
    expect(r.calculados.get("total")).toEqual({ valor: 2 });
  });

  it("coluna com o mesmo nome tem precedência sobre a variável", () => {
    const r = calcularColunas(
      [
        pontuada("a", [0, 2]),
        { id: "n", titulo: "Soma pontuações", tipo: "NUMERO", repetivel: false },
        calc("{Soma pontuações}"),
      ],
      (id) => ({ a: "Sim", n: "99" })[id as "a" | "n"],
    );
    expect(r.calculados.get("total")).toEqual({ valor: 99 });
  });

  describe("validação", () => {
    const col = (extra: Partial<ColunaValidavel> = {}): ColunaValidavel => ({
      titulo: "Item",
      tipo: "MULTIPLA_ESCOLHA",
      repetivel: false,
      opcoes: ["Não", "Sim"],
      pontuacoes: [
        { opcao: "Não", pontos: 0 },
        { opcao: "Sim", pontos: 1 },
      ],
      ...extra,
    });
    const total = (formula: string): ColunaValidavel => ({
      titulo: "Total",
      tipo: "CALCULADO",
      formula,
      repetivel: false,
    });

    it("aceita {Soma pontuações} em CALCULADO e em condição de coluna comum", () => {
      const classe: ColunaValidavel = {
        titulo: "Classe",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["A", "B"],
        opcoesCondicionais: [
          { opcao: "A", formula: "{Soma pontuações} < 3" },
          { opcao: "B", formula: "{Soma pontuações} >= 3" },
        ],
      };
      expect(validarFormulasDoExame([col(), total("{Soma pontuações}"), classe])).toBeNull();
    });

    it("barra o uso sem nenhuma coluna de pontuação", () => {
      const erro = validarFormulasDoExame([col({ pontuacoes: [] }), total("{Soma pontuações}")]);
      expect(erro).toContain("nenhuma coluna do exame está marcada como pontuação");
    });

    it("coluna de pontuação não pode usar a soma nas próprias condições", () => {
      const automatica = col({
        titulo: "Risco",
        opcoesCondicionais: [
          { opcao: "Não", formula: "{Soma pontuações} < 3" },
          { opcao: "Sim", formula: "{Soma pontuações} >= 3" },
        ],
      });
      expect(validarFormulasDoExame([automatica])).toContain("ciclo");
    });

    it("barra ciclo: pontuação automática → calculada → soma", () => {
      const automatica = col({
        titulo: "Risco",
        opcoesCondicionais: [
          { opcao: "Não", formula: "{Dobro} < 3" },
          { opcao: "Sim", formula: "{Dobro} >= 3" },
        ],
      });
      const dobro: ColunaValidavel = {
        titulo: "Dobro",
        tipo: "CALCULADO",
        formula: "{Soma pontuações} * 2",
        repetivel: false,
      };
      expect(validarFormulasDoExame([automatica, dobro])).toContain("ciclo");
    });

    it("nome reservado: variável do exame não pode se chamar Soma pontuações", () => {
      expect(
        validarFormulasDoExame([col(), total("{Soma pontuações}")], [
          { nome: "Soma pontuacoes", formula: "1" },
        ]),
      ).toMatch(/Soma pontuações/);
    });
  });
});

describe("fórmulas em campo com múltiplas entradas", () => {
  const COLUNAS: ColunaCalculo[] = [
    { id: "fator", titulo: "Fator", tipo: "NUMERO", repetivel: false },
    { id: "carga", titulo: "Carga", tipo: "NUMERO", repetivel: true, campoId: "serie" },
    { id: "reps", titulo: "Reps", tipo: "NUMERO", repetivel: true, campoId: "serie" },
    {
      id: "volume",
      titulo: "Volume",
      tipo: "CALCULADO",
      formula: "{Carga} * {Reps} * {Fator}",
      repetivel: true,
      campoId: "serie",
    },
  ];

  function calcular(
    colunas: ColunaCalculo[],
    valores: Record<string, string>,
    linhas: number[] = [0, 1],
    paciente?: DadosPacienteFormula,
    variaveis?: VariavelExame[],
  ) {
    const { valoresDoExame } = calcularColunas(
      colunas,
      (id) => valores[`${id}::0`],
      paciente,
      variaveis,
    );
    return calcularLinhasRepetiveis(
      colunas,
      () => linhas,
      (id, linha) => valores[chaveLinha(id, linha)],
      valoresDoExame,
      variaveis,
    );
  }

  it("cada entrada calcula com os próprios valores e os do exame", () => {
    const { calculados } = calcular(COLUNAS, {
      "fator::0": "2",
      "carga::0": "10",
      "reps::0": "3",
      "carga::1": "20",
      "reps::1": "5",
    });
    expect(calculados.get("volume::0")).toEqual({ valor: 60 });
    expect(calculados.get("volume::1")).toEqual({ valor: 200 });
  });

  it("entrada incompleta mostra o erro só nela", () => {
    const { calculados } = calcular(COLUNAS, {
      "fator::0": "2",
      "carga::0": "10",
      "reps::0": "3",
      "carga::1": "20",
    });
    expect(calculados.get("volume::0")).toEqual({ valor: 60 });
    expect(calculados.get("volume::1")).toEqual({ erro: "Preencha Reps para calcular" });
  });

  it("coluna da entrada tem precedência sobre a do exame, mesmo vazia", () => {
    const colunas: ColunaCalculo[] = [
      { id: "global", titulo: "Carga", tipo: "NUMERO", repetivel: false },
      { id: "carga", titulo: "Carga", tipo: "NUMERO", repetivel: true, campoId: "serie" },
      {
        id: "dobro",
        titulo: "Dobro",
        tipo: "CALCULADO",
        formula: "{Carga} * 2",
        repetivel: true,
        campoId: "serie",
      },
    ];
    const { calculados } = calcular(colunas, { "global::0": "100", "carga::0": "7" });
    expect(calculados.get("dobro::0")).toEqual({ valor: 14 });
    expect(calculados.get("dobro::1")).toEqual({ erro: "Preencha Carga para calcular" });
  });

  it("calculada encadeada na mesma entrada resolve em qualquer ordem", () => {
    const colunas: ColunaCalculo[] = [
      {
        id: "b",
        titulo: "B",
        tipo: "CALCULADO",
        formula: "{A} + 1",
        repetivel: true,
        campoId: "c",
      },
      {
        id: "a",
        titulo: "A",
        tipo: "CALCULADO",
        formula: "{N} * 2",
        repetivel: true,
        campoId: "c",
      },
      { id: "n", titulo: "N", tipo: "NUMERO", repetivel: true, campoId: "c" },
    ];
    const { calculados } = calcular(colunas, { "n::0": "1", "n::1": "5" });
    expect(calculados.get("b::0")).toEqual({ valor: 3 });
    expect(calculados.get("b::1")).toEqual({ valor: 11 });
  });

  it("campos repetíveis diferentes não se enxergam", () => {
    const colunas: ColunaCalculo[] = [
      { id: "x", titulo: "X", tipo: "NUMERO", repetivel: true, campoId: "c1" },
      {
        id: "y",
        titulo: "Y",
        tipo: "CALCULADO",
        formula: "{X} * 2",
        repetivel: true,
        campoId: "c2",
      },
    ];
    const { calculados } = calcular(colunas, { "x::0": "4" }, [0]);
    expect(calculados.get("y::0")).toEqual({ erro: "Preencha X para calcular" });
  });

  it("usa paciente, variáveis (que enxergam a entrada) e Soma pontuações do exame", () => {
    const colunas: ColunaCalculo[] = [
      {
        id: "p",
        titulo: "P",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: false,
        opcoes: ["A"],
        pontuacoes: [{ opcao: "A", pontos: 5 }],
      },
      { id: "n", titulo: "N", tipo: "NUMERO", repetivel: true, campoId: "c" },
      {
        id: "r",
        titulo: "R",
        tipo: "CALCULADO",
        formula: "{Dobro} + {Idade} + {Soma pontuações}",
        repetivel: true,
        campoId: "c",
      },
    ];
    const { calculados } = calcular(
      colunas,
      { "p::0": "A", "n::0": "1", "n::1": "2" },
      [0, 1],
      { idade: 30 },
      [{ nome: "Dobro", formula: "{N} * 2" }],
    );
    expect(calculados.get("r::0")).toEqual({ valor: 37 });
    expect(calculados.get("r::1")).toEqual({ valor: 39 });
  });

  it("opção automática é marcada por entrada, primeira que bate na seleção única", () => {
    const colunas: ColunaCalculo[] = [
      { id: "n", titulo: "N", tipo: "NUMERO", repetivel: true, campoId: "c" },
      {
        id: "classe",
        titulo: "Classe",
        tipo: "MULTIPLA_ESCOLHA",
        repetivel: true,
        campoId: "c",
        opcoes: ["Baixo", "Alto"],
        opcoesCondicionais: [
          { opcao: "Baixo", formula: "{N} < 5" },
          { opcao: "Alto", formula: "{N} >= 5" },
        ],
      },
    ];
    const { opcoesAutomaticas } = calcular(colunas, { "n::0": "1", "n::1": "9" });
    expect(opcoesAutomaticas.get("classe::0")?.selecionadas).toEqual(["Baixo"]);
    expect(opcoesAutomaticas.get("classe::1")?.selecionadas).toEqual(["Alto"]);
  });

  it("campo repetível sem fórmula não é calculado e o não-repetível segue igual", () => {
    const colunas: ColunaCalculo[] = [
      { id: "n", titulo: "N", tipo: "NUMERO", repetivel: true, campoId: "c" },
    ];
    const { calculados, opcoesAutomaticas } = calcular(colunas, { "n::0": "1" });
    expect(calculados.size).toBe(0);
    expect(opcoesAutomaticas.size).toBe(0);
  });

  describe("validação", () => {
    const n = (titulo: string, campoId = "c"): ColunaValidavel => ({
      titulo,
      tipo: "NUMERO",
      repetivel: true,
      campoId,
    });
    const calc = (titulo: string, formula: string, campoId = "c"): ColunaValidavel => ({
      titulo,
      tipo: "CALCULADO",
      formula,
      repetivel: true,
      campoId,
    });

    it("aceita referência a colunas do próprio campo", () => {
      expect(validarFormulasDoExame([n("A"), calc("B", "{A} * 2")])).toBeNull();
    });

    it("barra referência a coluna de outro campo repetível", () => {
      expect(
        validarFormulasDoExame([n("A", "c1"), calc("B", "{A} * 2", "c2")]),
      ).toMatch(/que não existe/);
    });

    it("barra fórmula do exame que cita coluna repetível, mesmo por variável", () => {
      const fora: ColunaValidavel = {
        titulo: "X",
        tipo: "CALCULADO",
        formula: "{V}",
        repetivel: false,
      };
      expect(
        validarFormulasDoExame([n("A"), fora], [{ nome: "V", formula: "{A}" }]),
      ).toMatch(/que não existe/);
    });

    it("aceita variável que cita coluna repetível usada dentro do campo", () => {
      expect(
        validarFormulasDoExame([n("A"), calc("B", "{V}")], [{ nome: "V", formula: "{A}" }]),
      ).toBeNull();
    });

    it("barra ciclo dentro do campo", () => {
      expect(
        validarFormulasDoExame([calc("A", "{B} + 1"), calc("B", "{A} + 1")]),
      ).toMatch(/ciclo/);
    });

    it("barra nome repetido dentro de campo com fórmula", () => {
      expect(
        validarFormulasDoExame([n("A"), n("a"), calc("B", "{A} * 2")]),
      ).toMatch(/neste campo/);
    });

    it("não barra nome repetido em campo repetível sem fórmula (exames já cadastrados)", () => {
      expect(validarFormulasDoExame([n("A"), n("A")])).toBeNull();
    });

    it("aceita o mesmo nome em campos repetíveis diferentes", () => {
      expect(
        validarFormulasDoExame([
          n("A", "c1"),
          calc("B", "{A} * 2", "c1"),
          n("A", "c2"),
          calc("B", "{A} * 3", "c2"),
        ]),
      ).toBeNull();
    });

    it("barra coluna de campo com fórmula com o nome de uma variável", () => {
      expect(
        validarFormulasDoExame(
          [n("A"), calc("B", "{A} * 2")],
          [{ nome: "A", formula: "1" }],
        ),
      ).toMatch(/variável chamada/);
    });

    it("pontuação continua barrada em campo repetível", () => {
      expect(
        validarFormulasDoExame([
          {
            titulo: "P",
            tipo: "MULTIPLA_ESCOLHA",
            repetivel: true,
            campoId: "c",
            opcoes: ["A"],
            pontuacoes: [{ opcao: "A", pontos: 1 }],
          },
        ]),
      ).toMatch(/múltiplas entradas/);
    });
  });
});
