import { describe, expect, it } from "vitest";
import { exameSchema } from "./exame";

function baseExame(colunaMultiplaEscolha: Record<string, unknown>) {
  return {
    nome: "Exame teste",
    tipo: "FISIOTERAPIA" as const,
    secoes: [
      {
        nome: "Seção 1",
        campos: [
          {
            nome: "Campo IMC",
            colunas: [
              {
                titulo: "IMC",
                tipo: "NUMERO" as const,
                opcoes: [],
                opcoesCondicionais: [],
              },
            ],
          },
          {
            nome: "Campo classificação",
            colunas: [colunaMultiplaEscolha],
          },
        ],
      },
    ],
  };
}

describe("exameSchema — opções automáticas de MULTIPLA_ESCOLHA", () => {
  it("rejeita condição vazia com a mensagem específica de validarFormulasDoExame, não o erro genérico do zod", () => {
    const exame = baseExame({
      titulo: "Classificação",
      tipo: "MULTIPLA_ESCOLHA",
      opcoes: ["Baixo peso", "Normal"],
      multiplaSelecao: false,
      opcoesCondicionais: [
        { opcao: "Baixo peso", formula: "{IMC} < 18.5" },
        { opcao: "Normal", formula: "" },
      ],
    });

    const parsed = exameSchema.safeParse(exame);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const mensagem = parsed.error.issues[0]?.message ?? "";
      expect(mensagem).toContain('condição da opção "Normal"');
      expect(mensagem).not.toMatch(/too small/i);
    }
  });

  it("aceita quando todas as opções têm condição preenchida", () => {
    const exame = baseExame({
      titulo: "Classificação",
      tipo: "MULTIPLA_ESCOLHA",
      opcoes: ["Baixo peso", "Normal"],
      multiplaSelecao: false,
      opcoesCondicionais: [
        { opcao: "Baixo peso", formula: "{IMC} < 18.5" },
        { opcao: "Normal", formula: "{IMC} >= 18.5" },
      ],
    });

    const parsed = exameSchema.safeParse(exame);
    expect(parsed.success).toBe(true);
  });

  it("continua exigindo condição em todas as opções (tudo ou nada) quando o resto do schema já passa", () => {
    const exame = baseExame({
      titulo: "Classificação",
      tipo: "MULTIPLA_ESCOLHA",
      opcoes: ["Baixo peso", "Normal", "Sobrepeso"],
      multiplaSelecao: false,
      opcoesCondicionais: [{ opcao: "Baixo peso", formula: "{IMC} < 18.5" }],
    });

    const parsed = exameSchema.safeParse(exame);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("TODAS as opções");
    }
  });
});

describe("exameSchema — permiteAnexo", () => {
  const colunaTexto = (extra: Record<string, unknown> = {}) => ({
    titulo: "Observação",
    tipo: "TEXTO" as const,
    ...extra,
  });
  const parse = (extra?: Record<string, unknown>) =>
    exameSchema.parse({
      nome: "Exame",
      tipo: "FISIOTERAPIA",
      secoes: [{ nome: "S", campos: [{ nome: "C", colunas: [colunaTexto(extra)] }] }],
    }).secoes[0].campos[0].colunas[0];

  it("assume que a coluna não aceita anexo quando não informado", () => {
    expect(parse().permiteAnexo).toBe(false);
  });

  it("preserva permiteAnexo: true", () => {
    expect(parse({ permiteAnexo: true }).permiteAnexo).toBe(true);
  });
});

describe("exameSchema — tabelas de referência", () => {
  const classificacao = {
    titulo: "Classificação",
    tipo: "MULTIPLA_ESCOLHA" as const,
    opcoes: ["Fraco", "Forte"],
    opcoesCondicionais: [
      { opcao: "Fraco", formula: "{IMC} <= {Ref.Limite}" },
      { opcao: "Forte", formula: "{IMC} > {Ref.Limite}" },
    ],
  };
  const tabela = {
    nome: "Ref",
    chaves: ["Idade"],
    saidas: ["Limite"],
    linhas: [{ faixas: [{ min: "20", max: "29" }], valores: ["24"] }],
  };

  it("aceita condição que cita {Tabela.Resultado} de uma tabela válida", () => {
    const r = exameSchema.safeParse({ ...baseExame(classificacao), tabelas: [tabela] });
    expect(r.success).toBe(true);
  });

  it("sem a tabela, a referência {Ref.Limite} não existe", () => {
    const r = exameSchema.safeParse(baseExame(classificacao));
    expect(r.success).toBe(false);
  });

  it("erro estrutural da tabela aponta o path da tabela", () => {
    const r = exameSchema.safeParse({
      ...baseExame(classificacao),
      tabelas: [{ ...tabela, linhas: [{ faixas: [{ min: "20", max: "29" }], valores: [""] }] }],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["tabelas", 0]);
      expect(r.error.issues[0].message).toContain("preencha um número");
    }
  });

  it("chave que não existe no exame aponta a tabela de origem", () => {
    const r = exameSchema.safeParse({
      ...baseExame(classificacao),
      tabelas: [{ ...tabela, chaves: ["Inexistente"] }],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["tabelas", 0]);
      expect(r.error.issues[0].message).toContain("Inexistente");
    }
  });
});
