import { describe, expect, it } from "vitest";
import {
  BUFFER_MAXIMO_MESES,
  BUFFER_PADRAO_MESES,
  bufferMesesGrade,
  datasDoDiaSemana,
  janelaCoberturaGrade,
  MESES_COBERTURA_GRADE,
  orcamentoGrade,
  preverGrade,
  somarDiasYmd,
} from "./grade-recorrente";

const NUNCA_FECHADO = () => false;

describe("grade recorrente — helpers de data", () => {
  it("somarDiasYmd atravessa virada de mês e de ano", () => {
    expect(somarDiasYmd("2026-01-31", 1)).toBe("2026-02-01");
    expect(somarDiasYmd("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDiasYmd("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("janelaCoberturaGrade — MENSAL (1 mês) cobre o mês inteiro de dataInicio", () => {
    expect(janelaCoberturaGrade("2026-09-08", 1)).toEqual({
      de: "2026-09-01",
      ate: "2026-09-30",
    });
    expect(janelaCoberturaGrade("2026-02-15", 1)).toEqual({
      de: "2026-02-01",
      ate: "2026-02-28",
    });
  });

  it("MESES_COBERTURA_GRADE mapeia periodicidade → meses", () => {
    expect(MESES_COBERTURA_GRADE.MENSAL).toBe(1);
    expect(MESES_COBERTURA_GRADE.TRIMESTRAL).toBe(3);
  });

  it("orcamentoGrade = atendimentos × meses (null quando plano é livre)", () => {
    expect(orcamentoGrade(4, 1)).toBe(4); // mensal 4x → 4 no total (transborda p/ out. se não coube)
    expect(orcamentoGrade(8, 3)).toBe(24); // trimestral 8x → 24 no total
    expect(orcamentoGrade(null, 3)).toBeNull();
  });

  it("janelaCoberturaGrade — TRIMESTRAL (3 meses) atravessa virada de ano", () => {
    expect(janelaCoberturaGrade("2026-09-08", 3)).toEqual({
      de: "2026-09-01",
      ate: "2026-11-30",
    });
    expect(janelaCoberturaGrade("2026-12-10", 3)).toEqual({
      de: "2026-12-01",
      ate: "2027-02-28",
    });
  });

  it("datasDoDiaSemana lista todas as segundas do intervalo, em ordem", () => {
    // 2026-09-08 é uma terça; a primeira segunda >= é 2026-09-14
    const segundas = datasDoDiaSemana("SEGUNDA", "2026-09-08", "2026-10-31");
    expect(segundas[0]).toBe("2026-09-14");
    expect(segundas).toContain("2026-09-21");
    expect(segundas.at(-1)).toBe("2026-10-26");
    // sempre 7 dias de diferença
    for (let i = 1; i < segundas.length; i++) {
      expect(somarDiasYmd(segundas[i - 1], 7)).toBe(segundas[i]);
    }
  });

  it("datasDoDiaSemana inclui o próprio dia quando ele já casa", () => {
    // 2026-09-14 é uma segunda
    const segundas = datasDoDiaSemana("SEGUNDA", "2026-09-14", "2026-09-21");
    expect(segundas).toEqual(["2026-09-14", "2026-09-21"]);
  });

  it("datasDoDiaSemana devolve vazio quando não há o dia no intervalo", () => {
    expect(datasDoDiaSemana("DOMINGO", "2026-09-14", "2026-09-19")).toEqual([]);
  });

  // Regressão: uma grade "rala" (poucos dias/semana) num plano trimestral com muitos
  // atendimentos/mês podia nunca atingir o total contratado — a janela de geração cortava
  // em meses+2 antes do orçamento (atendimentos × meses) ser esgotado, perdendo atendimento
  // silenciosamente. `bufferMesesGrade` garante uma janela bem mais generosa sempre que o
  // plano tem um total a perseguir.
  it("bufferMesesGrade usa o buffer máximo quando o plano tem teto total", () => {
    expect(bufferMesesGrade(orcamentoGrade(8, 3))).toBe(BUFFER_MAXIMO_MESES);
    expect(bufferMesesGrade(24)).toBe(BUFFER_MAXIMO_MESES);
  });

  it("bufferMesesGrade usa o buffer padrão (pequeno) quando o plano não tem teto", () => {
    expect(bufferMesesGrade(orcamentoGrade(null, 3))).toBe(BUFFER_PADRAO_MESES);
    expect(bufferMesesGrade(null)).toBe(BUFFER_PADRAO_MESES);
  });

  it("a janela com o buffer máximo é generosa o bastante pra uma grade rala esgotar um total alto", () => {
    // Plano trimestral, 8 atendimentos/mês → 24 no total, grade com só 1 dia/semana.
    const meses = MESES_COBERTURA_GRADE.TRIMESTRAL;
    const orcamentoTotal = orcamentoGrade(8, meses);
    const { de, ate } = janelaCoberturaGrade(
      "2026-09-14",
      meses + bufferMesesGrade(orcamentoTotal),
    );
    const ocorrencias = datasDoDiaSemana("SEGUNDA", de, ate);
    expect(ocorrencias.length).toBeGreaterThanOrEqual(orcamentoTotal!);
  });
});

describe("preverGrade", () => {
  it("preenche o total quando a grade tem dias suficientes (regressão do caso relatado)", () => {
    // Trimestral, 8/mês → 24 no total; grade com 3 dias/semana enche rápido.
    const previsao = preverGrade({
      linhas: [{ diaSemana: "SEGUNDA" }, { diaSemana: "TERCA" }, { diaSemana: "QUARTA" }],
      deYmd: "2026-09-14",
      fimYmd: janelaCoberturaGrade("2026-09-14", 3 + BUFFER_MAXIMO_MESES).ate,
      atendimentosMes: 8,
      orcamentoTotal: 24,
      usadosTotalBase: 0,
      usadosNoMesBase: {},
      diaFechado: NUNCA_FECHADO,
    });
    expect(previsao.completo).toBe(true);
    expect(previsao.gerados).toBe(24);
  });

  it("acusa quando a grade é rala demais pra fechar a conta dentro da janela", () => {
    // Só 1 dia/semana, janela curta: não dá tempo de bater os 24.
    const previsao = preverGrade({
      linhas: [{ diaSemana: "SEGUNDA" }],
      deYmd: "2026-09-14",
      fimYmd: "2026-10-31", // ~7 semanas, bem menos que as 24 necessárias
      atendimentosMes: 8,
      orcamentoTotal: 24,
      usadosTotalBase: 0,
      usadosNoMesBase: {},
      diaFechado: NUNCA_FECHADO,
    });
    expect(previsao.completo).toBe(false);
    expect(previsao.gerados).toBeLessThan(24);
  });

  it("respeita o limite mensal mesmo com dias sobrando na semana", () => {
    const previsao = preverGrade({
      linhas: [{ diaSemana: "SEGUNDA" }, { diaSemana: "TERCA" }, { diaSemana: "QUARTA" }],
      deYmd: "2026-09-01",
      fimYmd: "2026-09-30",
      atendimentosMes: 2,
      orcamentoTotal: null,
      usadosTotalBase: 0,
      usadosNoMesBase: {},
      diaFechado: NUNCA_FECHADO,
    });
    expect(previsao.gerados).toBe(2);
  });

  it("pula dias fechados (feriado/fim de semana) sem contar contra o total", () => {
    const fechaSegunda = (ymd: string) => ymd === "2026-09-14";
    const previsao = preverGrade({
      linhas: [{ diaSemana: "SEGUNDA" }],
      deYmd: "2026-09-14",
      fimYmd: "2026-09-28",
      atendimentosMes: null,
      orcamentoTotal: null,
      usadosTotalBase: 0,
      usadosNoMesBase: {},
      diaFechado: fechaSegunda,
    });
    // Segundas no intervalo: 14, 21, 28 — só a 14 é fechada.
    expect(previsao.gerados).toBe(2);
    expect(previsao.ultimaData).toBe("2026-09-28");
  });

  it("considera a base já usada (atendimentos fora da grade) antes de contar os novos", () => {
    const previsao = preverGrade({
      linhas: [{ diaSemana: "SEGUNDA" }],
      deYmd: "2026-09-14",
      fimYmd: "2026-09-30",
      atendimentosMes: null,
      orcamentoTotal: 3,
      usadosTotalBase: 2,
      usadosNoMesBase: { "2026-09": 2 },
      diaFechado: NUNCA_FECHADO,
    });
    expect(previsao.gerados).toBe(1);
    expect(previsao.completo).toBe(true);
  });

  it("sem linhas, não gera nada e não trava (completo depende só do total já usado)", () => {
    const previsao = preverGrade({
      linhas: [],
      deYmd: "2026-09-01",
      fimYmd: "2026-09-30",
      atendimentosMes: 4,
      orcamentoTotal: 4,
      usadosTotalBase: 0,
      usadosNoMesBase: {},
      diaFechado: NUNCA_FECHADO,
    });
    expect(previsao.gerados).toBe(0);
    expect(previsao.ultimaData).toBeNull();
    expect(previsao.completo).toBe(false);
  });
});
