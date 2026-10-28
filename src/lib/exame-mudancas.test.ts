import { describe, expect, it } from "vitest";
import type { ExameDraft, SecaoDraft } from "./exame-draft";
import { listarResumido, resumirMudancas } from "./exame-mudancas";
import type { TabelaReferencia } from "./tabela-referencia";

function secao(id: string, nome: string, titulo = "Peso"): SecaoDraft {
  return {
    id,
    nome,
    campos: [
      {
        id: `${id}-c`,
        nome: "Campo",
        repetivel: false,
        identificarMembro: false,
        colunas: [
          {
            id: `${id}-k`,
            titulo,
            tipo: "NUMERO",
            formatacao: "",
            opcoes: [],
            multiplaSelecao: false,
            opcoesCondicionais: [],
            coresOpcoes: [],
            usaPontuacao: false,
            pontuacoes: [],
            permiteAnexo: false,
            valorIdeal: "",
            direcaoIdeal: "PROXIMO_IDEAL",
            formula: "",
          },
        ],
      },
    ],
  };
}

function tabela(id: string, nome: string, valor = "1"): TabelaReferencia {
  return { id, nome, chaves: ["Idade"], saidas: ["Valor"], linhas: [{ faixas: [{ min: "", max: "" }], valores: [valor] }] };
}

const base: ExameDraft = {
  nome: "RIE-FIT",
  descricao: "",
  tipo: "EDUCACAO_FISICA",
  sombra: false,
  variaveis: [],
  tabelas: [tabela("t1", "Wells"), tabela("t2", "Flexões")],
  secoes: [secao("s1", "PERIMETRIA"), secao("s2", "ANTROPOMETRIA")],
};

describe("resumirMudancas", () => {
  it("nada mudou: lista vazia", () => {
    expect(resumirMudancas(base, structuredClone(base))).toEqual([]);
  });

  it("aponta tabela editada, nova e removida pelo nome", () => {
    const depois = { ...base, tabelas: [tabela("t2", "Flexões", "9"), tabela("t3", "Impulsão")] };
    expect(resumirMudancas(base, depois)).toEqual([
      "Tabela Flexões",
      "Tabela Impulsão (nova)",
      "Tabela Wells (removida)",
    ]);
  });

  it("aponta a seção quando muda algo dentro dela e os campos do exame", () => {
    const depois = {
      ...base,
      nome: "RIE-FIT v2",
      descricao: "nova",
      secoes: [secao("s1", "PERIMETRIA"), secao("s2", "ANTROPOMETRIA", "Massa")],
    };
    expect(resumirMudancas(base, depois)).toEqual([
      "Nome do exame",
      "Descrição",
      "Seção ANTROPOMETRIA",
    ]);
  });

  it("só a ordem mudou", () => {
    const depois = { ...base, secoes: [base.secoes[1], base.secoes[0]] };
    expect(resumirMudancas(base, depois)).toEqual(["Ordem das seções"]);
  });
});

describe("listarResumido", () => {
  it("junta até o máximo e resume o resto", () => {
    expect(listarResumido(["A", "B"])).toBe("A, B");
    expect(listarResumido(["A", "B", "C", "D", "E"])).toBe("A, B, C e mais 2");
  });
});
