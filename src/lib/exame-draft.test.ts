import { describe, expect, it } from "vitest";
import {
  colunasReferenciaveis,
  renomearReferenciaEmSecoes,
  type ColunaDraft,
  type SecaoDraft,
} from "./exame-draft";

function coluna(titulo: string, tipo: ColunaDraft["tipo"], formula = ""): ColunaDraft {
  return { titulo, tipo, formula, opcoesCondicionais: [] } as unknown as ColunaDraft;
}

function secoes(): SecaoDraft[] {
  return [
    {
      nome: "S",
      campos: [
        {
          nome: "Exame",
          repetivel: false,
          identificarMembro: false,
          colunas: [
            coluna("Peso", "NUMERO"),
            coluna("Carga", "NUMERO"),
            coluna("Geral", "CALCULADO", "{Carga} * {Peso}"),
          ],
        },
        {
          nome: "Série",
          repetivel: true,
          identificarMembro: false,
          colunas: [
            coluna("Reps", "NUMERO"),
            coluna("Volume", "CALCULADO", "{Reps} * {Peso}"),
          ],
        },
        {
          nome: "Outra série",
          repetivel: true,
          identificarMembro: false,
          colunas: [
            coluna("Reps", "NUMERO"),
            coluna("Carga", "NUMERO"),
            coluna("Total", "CALCULADO", "{Reps} * {Carga}"),
          ],
        },
      ],
    },
  ];
}

function formula(s: SecaoDraft[], campo: number, col: number) {
  return s[0].campos[campo].colunas[col].formula;
}

describe("colunasReferenciaveis", () => {
  it("campo repetível enxerga as próprias colunas e as do exame", () => {
    expect(colunasReferenciaveis(secoes(), 0, 1, 1)).toEqual(["Peso", "Carga", "Geral", "Reps"]);
  });

  it("campo não-repetível não enxerga colunas de campo repetível", () => {
    expect(colunasReferenciaveis(secoes(), 0, 0, 2)).toEqual(["Peso", "Carga"]);
  });

  it("não repete o nome que existe no exame e na entrada", () => {
    expect(colunasReferenciaveis(secoes(), 0, 2, 2)).toEqual(["Peso", "Carga", "Geral", "Reps"]);
  });
});

describe("renomearReferenciaEmSecoes", () => {
  it("coluna de campo repetível só renomeia no próprio campo", () => {
    const r = renomearReferenciaEmSecoes(secoes(), "Reps", "Repetições", {
      secaoIndex: 0,
      campoIndex: 1,
    });
    expect(formula(r, 1, 1)).toBe("{Repetições} * {Peso}");
    expect(formula(r, 2, 2)).toBe("{Reps} * {Carga}");
  });

  it("coluna do exame renomeia em todo lugar, inclusive em campo repetível", () => {
    const r = renomearReferenciaEmSecoes(secoes(), "Peso", "Massa", {
      secaoIndex: 0,
      campoIndex: 0,
    });
    expect(formula(r, 0, 2)).toBe("{Carga} * {Massa}");
    expect(formula(r, 1, 1)).toBe("{Reps} * {Massa}");
  });

  it("não renomeia em campo repetível que tem coluna própria com aquele nome", () => {
    const r = renomearReferenciaEmSecoes(secoes(), "Carga", "Peso total", {
      secaoIndex: 0,
      campoIndex: 0,
    });
    expect(formula(r, 0, 2)).toBe("{Peso total} * {Peso}");
    expect(formula(r, 2, 2)).toBe("{Reps} * {Carga}");
  });

  it("sem origem (variável renomeada) alcança todas as fórmulas", () => {
    const r = renomearReferenciaEmSecoes(secoes(), "Reps", "R");
    expect(formula(r, 1, 1)).toBe("{R} * {Peso}");
    expect(formula(r, 2, 2)).toBe("{R} * {Carga}");
  });
});
