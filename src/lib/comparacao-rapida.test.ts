import { describe, expect, it } from "vitest";
import {
  montarLinhasComparacaoRapida,
  montarSeriesNumericas,
  type ComparacaoRapidaExame,
} from "./comparacao-rapida";

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
