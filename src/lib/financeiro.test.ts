import { describe, expect, it } from "vitest";
import {
  analisarFinanceiro,
  categoriaReceita,
  mesReferencia,
  rotuloMes,
  sequenciaMeses,
  type CobrancaLinha,
} from "./financeiro";

describe("categoriaReceita", () => {
  it("classifica pelos tipos do plano", () => {
    expect(categoriaReceita(null)).toBe("AVULSO");
    expect(categoriaReceita([])).toBe("AVULSO");
    expect(categoriaReceita(["FISIOTERAPIA"])).toBe("FISIOTERAPIA");
    expect(categoriaReceita(["EDUCACAO_FISICA"])).toBe("EDUCACAO_FISICA");
    expect(categoriaReceita(["FISIOTERAPIA", "EDUCACAO_FISICA"])).toBe(
      "COMBINADO",
    );
  });

  it("servicoId tem prioridade sobre tipos nulo", () => {
    expect(categoriaReceita(null, "servico-1")).toBe("SERVICO");
    expect(categoriaReceita([], "servico-1")).toBe("SERVICO");
  });
});

describe("mesReferencia / rotuloMes", () => {
  it("usa o dia-calendário de Brasília, não o de UTC", () => {
    // 01/01/2026 01:00 UTC = 31/12/2025 22:00 em Brasília
    expect(mesReferencia(new Date("2026-01-01T01:00:00Z"))).toBe("2025-12");
    expect(mesReferencia(new Date("2026-03-15T12:00:00Z"))).toBe("2026-03");
  });

  it("rótulo pt-BR curto", () => {
    expect(rotuloMes("2025-12")).toBe("dez/25");
    expect(rotuloMes("2026-01")).toBe("jan/26");
  });
});

describe("sequenciaMeses", () => {
  it("passado termina no mês atual, cronológico", () => {
    const seq = sequenciaMeses(new Date("2026-02-10T12:00:00Z"), 3, "passado");
    expect(seq).toEqual(["2025-12", "2026-01", "2026-02"]);
  });

  it("futuro começa no mês atual e cruza a virada de ano", () => {
    const seq = sequenciaMeses(new Date("2026-11-10T12:00:00Z"), 4, "futuro");
    expect(seq).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });
});

const linha = (o: Partial<CobrancaLinha>): CobrancaLinha => ({
  valor: 100,
  status: "PAGO",
  pagoEm: new Date("2026-03-10T12:00:00Z"),
  vencimento: new Date("2026-03-10T12:00:00Z"),
  planoNome: "Plano X",
  pacienteId: "p1",
  pacienteNome: "Fulano",
  tipos: ["FISIOTERAPIA"],
  servicoId: null,
  taxaProfissional: null,
  ...o,
});

const AGORA = new Date("2026-03-15T12:00:00Z");

describe("analisarFinanceiro", () => {
  it("entrada vazia: KPIs zerados e arrays de meses preenchidos", () => {
    const a = analisarFinanceiro([], AGORA);
    expect(a.kpis).toEqual({
      recebidoMes: 0,
      aReceberMes: 0,
      totalAtrasado: 0,
      ticketMedio: 0,
      recebido12m: 0,
      retidoProfissionaisMes: 0,
    });
    expect(a.receitaPorMes).toHaveLength(12);
    expect(a.receitaPorMes.at(-1)).toMatchObject({ mes: "2026-03", recebido: 0 });
    expect(a.aReceberPorMes).toHaveLength(6);
    expect(a.aReceberPorMes[0].mes).toBe("2026-03");
    expect(a.receitaModalidadePorMes).toHaveLength(6);
    expect(a.receitaPorModalidadeMes).toEqual([]);
  });

  it("pagamento perto da meia-noite UTC cai no mês certo de Brasília", () => {
    // 01/03/2026 02:00 UTC = 28/02/2026 23:00 BRT → fevereiro
    const a = analisarFinanceiro(
      [linha({ pagoEm: new Date("2026-03-01T02:00:00Z"), valor: 200 })],
      AGORA,
    );
    expect(a.receitaPorMes.find((m) => m.mes === "2026-02")?.recebido).toBe(200);
    expect(a.receitaPorMes.find((m) => m.mes === "2026-03")?.recebido).toBe(0);
    expect(a.kpis.recebidoMes).toBe(0);
  });

  it("cobrança pendente vencida não entra em aReceberPorMes, entra em atraso", () => {
    const a = analisarFinanceiro(
      [
        linha({
          status: "PENDENTE",
          pagoEm: null,
          vencimento: new Date("2026-03-01T12:00:00Z"),
          valor: 50,
        }),
        linha({
          status: "PENDENTE",
          pagoEm: null,
          vencimento: new Date("2026-04-10T12:00:00Z"),
          valor: 80,
        }),
      ],
      AGORA,
    );
    expect(a.kpis.totalAtrasado).toBe(50);
    expect(a.aReceberPorMes.find((m) => m.mes === "2026-04")?.valor).toBe(80);
    expect(a.aReceberPorMes.find((m) => m.mes === "2026-03")?.valor).toBe(0);
  });

  it("split por modalidade do mês soma 100% e cobre as 4 categorias", () => {
    const a = analisarFinanceiro(
      [
        linha({ tipos: ["EDUCACAO_FISICA"], valor: 300 }),
        linha({ tipos: ["FISIOTERAPIA"], valor: 300 }),
        linha({ tipos: ["FISIOTERAPIA", "EDUCACAO_FISICA"], valor: 200 }),
        linha({ tipos: null, valor: 200 }),
      ],
      AGORA,
    );
    const cats = a.receitaPorModalidadeMes;
    expect(cats).toHaveLength(4);
    expect(cats.reduce((s, c) => s + c.pct, 0)).toBe(100);
    expect(cats.find((c) => c.categoria === "COMBINADO")?.valor).toBe(200);
    expect(cats.find((c) => c.categoria === "AVULSO")?.valor).toBe(200);
    expect(a.kpis.recebidoMes).toBe(1000);
    expect(a.kpis.ticketMedio).toBe(250);
  });

  it("cobrança de serviço avulso cai na categoria SERVICO e soma o KPI de taxa retida", () => {
    const a = analisarFinanceiro(
      [
        linha({
          tipos: null,
          servicoId: "servico-1",
          valor: 200,
          taxaProfissional: 40,
        }),
        linha({ tipos: ["FISIOTERAPIA"], valor: 100, taxaProfissional: null }),
      ],
      AGORA,
    );
    const servico = a.receitaPorModalidadeMes.find((c) => c.categoria === "SERVICO");
    expect(servico?.valor).toBe(200);
    expect(a.kpis.retidoProfissionaisMes).toBe(40);
  });

  it("cobrança sem taxaProfissional (null) não quebra a soma do KPI", () => {
    const a = analisarFinanceiro(
      [linha({ servicoId: "servico-1", valor: 100, taxaProfissional: null })],
      AGORA,
    );
    expect(a.kpis.retidoProfissionaisMes).toBe(0);
  });

  it("rankings de planos e pacientes ordenados por valor", () => {
    const a = analisarFinanceiro(
      [
        linha({ planoNome: "A", pacienteId: "p1", pacienteNome: "Ana", valor: 100 }),
        linha({ planoNome: "A", pacienteId: "p2", pacienteNome: "Bia", valor: 400 }),
        linha({ planoNome: "B", pacienteId: "p1", pacienteNome: "Ana", valor: 50 }),
      ],
      AGORA,
    );
    expect(a.topPlanos[0]).toMatchObject({ nome: "A", valor: 500, qtd: 2 });
    expect(a.topPacientes[0]).toMatchObject({ nome: "Bia", valor: 400 });
    expect(a.topPacientes[1]).toMatchObject({ nome: "Ana", valor: 150 });
  });
});
