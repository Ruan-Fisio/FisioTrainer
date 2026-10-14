import { describe, expect, it } from "vitest";
import {
  acrescentarValoresCalculados,
  montarLinhasComparacaoRapida,
  filtrarSeriesPorChaves,
  montarSeriesNumericas,
  resumirSerie,
  type ComparacaoRapidaExame,
} from "./comparacao-rapida";

describe("resumirSerie", () => {
  it("calcula delta e percentual entre primeiro e último valor", () => {
    expect(resumirSerie([{ valor: 27 }, { valor: 30 }, { valor: 36 }])).toEqual({
      inicial: 27,
      final: 36,
      delta: 9,
      percentual: 33,
      direcao: "alta",
    });
  });

  it("detecta queda", () => {
    const r = resumirSerie([{ valor: 80 }, { valor: 60 }]);
    expect(r?.delta).toBe(-20);
    expect(r?.percentual).toBe(-25);
    expect(r?.direcao).toBe("queda");
  });

  it("ignora pontos nulos nas pontas", () => {
    const r = resumirSerie([{ valor: null }, { valor: 10 }, { valor: null }, { valor: 12 }]);
    expect(r?.inicial).toBe(10);
    expect(r?.final).toBe(12);
  });

  it("retorna null com menos de 2 valores", () => {
    expect(resumirSerie([{ valor: 5 }, { valor: null }])).toBeNull();
  });

  it("percentual é null quando o inicial é zero", () => {
    expect(resumirSerie([{ valor: 0 }, { valor: 4 }])?.percentual).toBeNull();
  });

  it("estável quando não muda", () => {
    expect(resumirSerie([{ valor: 5 }, { valor: 5 }])?.direcao).toBe("estavel");
  });
});

function coluna(id: string, titulo: string, tipo = "TEXTO") {
  return { id, titulo, ordem: 0, tipo, formatacao: null, multiplaSelecao: false };
}

describe("montarLinhasComparacaoRapida", () => {
  it("monta uma linha por coluna de campo não-repetível, com valor de cada execução", () => {
    const exame: ComparacaoRapidaExame = {
      secoes: [
        {
          id: "s1",
          nome: "Antropometria",
          ordem: 0,
          campos: [
            {
              id: "c1",
              nome: "Peso",
              ordem: 0,
              repetivel: false,
              colunas: [coluna("col1", "Peso (kg)")],
            },
          ],
        },
      ],
    };

    const execucoes = [
      { id: "avaliacao", valores: [{ colunaId: "col1", linha: 0, valor: "55.7" }] },
      { id: "retorno1", valores: [{ colunaId: "col1", linha: 0, valor: "55.35" }] },
    ];

    const secoes = montarLinhasComparacaoRapida(exame, execucoes);

    expect(secoes).toHaveLength(1);
    expect(secoes[0].linhas).toHaveLength(1);
    const [linha] = secoes[0].linhas;
    expect(linha.coluna.id).toBe("col1");
    expect(linha.valoresPorExecucaoId.get("avaliacao")).toBe("55.7");
    expect(linha.valoresPorExecucaoId.get("retorno1")).toBe("55.35");
  });

  it("enumera linhas de campo repetível pela união entre execuções, mesmo quando uma não tem aquela linha", () => {
    const exame: ComparacaoRapidaExame = {
      secoes: [
        {
          id: "s1",
          nome: "Sangue",
          ordem: 0,
          campos: [
            {
              id: "c1",
              nome: "Exame de sangue",
              ordem: 0,
              repetivel: true,
              colunas: [coluna("col1", "Valor")],
            },
          ],
        },
      ],
    };

    const execucoes = [
      {
        id: "avaliacao",
        valores: [
          { colunaId: "col1", linha: 0, valor: "A" },
          { colunaId: "col1", linha: 1, valor: "B" },
        ],
      },
      // retorno só preencheu a linha 0 — a linha 1 continua aparecendo, vazia
      { id: "retorno1", valores: [{ colunaId: "col1", linha: 0, valor: "A2" }] },
    ];

    const secoes = montarLinhasComparacaoRapida(exame, execucoes);
    const linhas = secoes[0].linhas;

    expect(linhas).toHaveLength(2);
    expect(linhas[0].linha).toBe(0);
    expect(linhas[0].valoresPorExecucaoId.get("avaliacao")).toBe("A");
    expect(linhas[0].valoresPorExecucaoId.get("retorno1")).toBe("A2");
    expect(linhas[1].linha).toBe(1);
    expect(linhas[1].valoresPorExecucaoId.get("avaliacao")).toBe("B");
    expect(linhas[1].valoresPorExecucaoId.get("retorno1")).toBeUndefined();
  });

  it("mantém a linha de uma coluna sem nenhum valor preenchido em qualquer execução (célula vazia, não escondida)", () => {
    const exame: ComparacaoRapidaExame = {
      secoes: [
        {
          id: "s1",
          nome: "Sec",
          ordem: 0,
          campos: [
            {
              id: "c1",
              nome: "Campo",
              ordem: 0,
              repetivel: false,
              colunas: [coluna("col1", "Nunca preenchido")],
            },
          ],
        },
      ],
    };

    const execucoes = [
      { id: "avaliacao", valores: [] },
      { id: "retorno1", valores: [] },
    ];

    const secoes = montarLinhasComparacaoRapida(exame, execucoes);

    expect(secoes[0].linhas).toHaveLength(1);
    expect(secoes[0].linhas[0].valoresPorExecucaoId.get("avaliacao")).toBeUndefined();
    expect(secoes[0].linhas[0].valoresPorExecucaoId.get("retorno1")).toBeUndefined();
  });
});

describe("montarSeriesNumericas", () => {
  it("monta uma série só para colunas do tipo NUMERO, ignorando as demais", () => {
    const exame: ComparacaoRapidaExame = {
      secoes: [
        {
          id: "s1",
          nome: "Antropometria",
          ordem: 0,
          campos: [
            {
              id: "c1",
              nome: "Peso",
              ordem: 0,
              repetivel: false,
              colunas: [
                coluna("peso", "Peso (kg)", "NUMERO"),
                coluna("obs", "Observação", "TEXTO"),
              ],
            },
          ],
        },
      ],
    };

    const execucoes = [
      { id: "avaliacao", valores: [{ colunaId: "peso", linha: 0, valor: "55.7" }, { colunaId: "obs", linha: 0, valor: "ok" }] },
      { id: "retorno1", valores: [{ colunaId: "peso", linha: 0, valor: "55,35" }, { colunaId: "obs", linha: 0, valor: "ok" }] },
    ];

    const secoes = montarLinhasComparacaoRapida(exame, execucoes);
    const series = montarSeriesNumericas(secoes, ["avaliacao", "retorno1"]);

    expect(series).toHaveLength(1);
    expect(series[0].titulo).toBe("Peso — Peso (kg)");
    expect(series[0].pontos).toEqual([
      { execucaoId: "avaliacao", valor: 55.7 },
      { execucaoId: "retorno1", valor: 55.35 },
    ]);
  });

  it("gera ponto nulo quando a execução não preencheu aquela coluna, sem quebrar a série", () => {
    const exame: ComparacaoRapidaExame = {
      secoes: [
        {
          id: "s1",
          nome: "Sec",
          ordem: 0,
          campos: [
            {
              id: "c1",
              nome: "",
              ordem: 0,
              repetivel: false,
              colunas: [coluna("col1", "Frequência cardíaca", "NUMERO")],
            },
          ],
        },
      ],
    };

    const execucoes = [
      { id: "avaliacao", valores: [{ colunaId: "col1", linha: 0, valor: "70" }] },
      { id: "retorno1", valores: [] },
    ];

    const secoes = montarLinhasComparacaoRapida(exame, execucoes);
    const series = montarSeriesNumericas(secoes, ["avaliacao", "retorno1"]);

    expect(series).toHaveLength(1);
    expect(series[0].pontos).toEqual([
      { execucaoId: "avaliacao", valor: 70 },
      { execucaoId: "retorno1", valor: null },
    ]);
  });

  it("não gera série pra coluna numérica nunca preenchida em nenhuma execução", () => {
    const exame: ComparacaoRapidaExame = {
      secoes: [
        {
          id: "s1",
          nome: "Sec",
          ordem: 0,
          campos: [
            {
              id: "c1",
              nome: "Campo",
              ordem: 0,
              repetivel: false,
              colunas: [coluna("col1", "Nunca preenchido", "NUMERO")],
            },
          ],
        },
      ],
    };

    const execucoes = [
      { id: "avaliacao", valores: [] },
      { id: "retorno1", valores: [] },
    ];

    const secoes = montarLinhasComparacaoRapida(exame, execucoes);
    const series = montarSeriesNumericas(secoes, ["avaliacao", "retorno1"]);

    expect(series).toHaveLength(0);
  });
});

describe("filtrarSeriesPorChaves", () => {
  const mk = (chave: string) => ({ chave, titulo: chave, unidade: null, pontos: [] });
  const series = ["a", "b", "c", "d", "e", "f"].map(mk);

  it("null devolve todas", () => {
    expect(filtrarSeriesPorChaves(series, null)).toHaveLength(6);
  });

  it("respeita a ordem escolhida e ignora chaves inexistentes/duplicadas", () => {
    expect(
      filtrarSeriesPorChaves(series, ["c", "x", "a", "c"]).map((s) => s.chave),
    ).toEqual(["c", "a"]);
  });

  it("limita a 4", () => {
    expect(filtrarSeriesPorChaves(series, ["a", "b", "c", "d", "e"])).toHaveLength(4);
  });

  it("lista vazia devolve nenhuma", () => {
    expect(filtrarSeriesPorChaves(series, [])).toEqual([]);
  });
});

describe("acrescentarValoresCalculados", () => {
  const exame = {
    secoes: [
      {
        campos: [
          {
            repetivel: false,
            colunas: [
              { id: "peso", titulo: "Peso", tipo: "NUMERO" },
              { id: "altura", titulo: "Altura", tipo: "NUMERO" },
              {
                id: "imc",
                titulo: "IMC",
                tipo: "CALCULADO",
                formula: "{Peso} / ({Altura} * {Altura})",
              },
              {
                id: "idade2",
                titulo: "Idade x2",
                tipo: "CALCULADO",
                formula: "{Idade} * 2",
              },
            ],
          },
        ],
      },
    ],
  };

  it("calcula a coluna CALCULADO por execução, a partir dos valores de cada uma", () => {
    const execucoes = [
      {
        id: "a",
        valores: [
          { colunaId: "peso", linha: 0, valor: "80" },
          { colunaId: "altura", linha: 0, valor: "2" },
        ],
      },
      {
        id: "b",
        valores: [
          { colunaId: "peso", linha: 0, valor: "72" },
          { colunaId: "altura", linha: 0, valor: "2" },
        ],
      },
    ];
    const [a, b] = acrescentarValoresCalculados(exame, execucoes, { idade: 30 });
    expect(a.valores).toContainEqual({ colunaId: "imc", linha: 0, valor: "20" });
    expect(b.valores).toContainEqual({ colunaId: "imc", linha: 0, valor: "18" });
    expect(a.valores).toContainEqual({ colunaId: "idade2", linha: 0, valor: "60" });
  });

  it("deixa sem valor quando falta dado de origem e não altera a entrada", () => {
    const execucoes = [{ id: "a", valores: [{ colunaId: "peso", linha: 0, valor: "80" }] }];
    const [a] = acrescentarValoresCalculados(exame, execucoes);
    expect(a.valores.find((v) => v.colunaId === "imc")).toBeUndefined();
    expect(execucoes[0].valores).toHaveLength(1);
  });

  it("calculada aparece na linha da comparação e na série numérica", () => {
    const execucoes = acrescentarValoresCalculados(
      exame,
      [
        { id: "a", valores: [{ colunaId: "peso", linha: 0, valor: "80" }, { colunaId: "altura", linha: 0, valor: "2" }] },
        { id: "b", valores: [{ colunaId: "peso", linha: 0, valor: "72" }, { colunaId: "altura", linha: 0, valor: "2" }] },
      ],
    );
    const secoes = montarLinhasComparacaoRapida(
      {
        secoes: exame.secoes.map((s, i) => ({
          id: `s${i}`,
          nome: "S",
          ordem: 0,
          campos: s.campos.map((c, j) => ({
            id: `c${j}`,
            nome: "",
            ordem: 0,
            repetivel: c.repetivel,
            colunas: c.colunas.map((col, k) => ({
              id: col.id,
              titulo: col.titulo,
              ordem: k,
              tipo: col.tipo,
              multiplaSelecao: false,
            })),
          })),
        })),
      },
      execucoes,
    );
    const linhaImc = secoes[0].linhas.find((l) => l.coluna.id === "imc")!;
    expect(linhaImc.valoresPorExecucaoId.get("a")).toBe("20");
    const series = montarSeriesNumericas(secoes, ["a", "b"]);
    expect(series.find((s) => s.titulo === "IMC")?.pontos.map((p) => p.valor)).toEqual([20, 18]);
  });

  it("exame sem coluna calculada devolve as execuções como vieram", () => {
    const execucoes = [{ id: "a", valores: [] }];
    expect(
      acrescentarValoresCalculados(
        { secoes: [{ campos: [{ repetivel: false, colunas: [{ id: "x", titulo: "X", tipo: "NUMERO" }] }] }] },
        execucoes,
      ),
    ).toBe(execucoes);
  });
});
