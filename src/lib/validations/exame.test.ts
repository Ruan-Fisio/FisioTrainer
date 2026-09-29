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
