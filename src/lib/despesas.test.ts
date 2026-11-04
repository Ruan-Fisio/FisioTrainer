import { describe, expect, it } from "vitest";
import {
  compararReceitaDespesa,
  deslocarMes,
  despesaAtrasada,
  intervaloDoMes,
  normalizarMes,
  parseFiltrosDespesas,
  resumirDespesasMes,
  rotuloMesExtenso,
  type DespesaLinha,
} from "./despesas";

const AGORA = new Date("2026-11-15T15:00:00Z");

function linha(p: Partial<DespesaLinha>): DespesaLinha {
  return {
    categoria: "OUTROS",
    valor: 100,
    data: new Date("2026-11-20T15:00:00Z"),
    status: "PENDENTE",
    pagoEm: null,
    ...p,
  };
}

describe("despesaAtrasada", () => {
  it("pendente vencida ontem está atrasada; vencendo hoje, não", () => {
    expect(despesaAtrasada(linha({ data: new Date("2026-11-14T15:00:00Z") }), AGORA)).toBe(true);
    expect(despesaAtrasada(linha({ data: new Date("2026-11-15T15:00:00Z") }), AGORA)).toBe(false);
  });

  it("paga nunca está atrasada", () => {
    expect(
      despesaAtrasada(linha({ status: "PAGO", data: new Date("2026-01-01T15:00:00Z") }), AGORA),
    ).toBe(false);
  });

  it("usa o dia de Brasília: 22h do dia 14 ainda é dia 14, mesmo já sendo 15 em UTC", () => {
    const agora = new Date("2026-11-15T01:00:00Z"); // 14/11 22:00 em Brasília
    expect(despesaAtrasada(linha({ data: new Date("2026-11-14T15:00:00Z") }), agora)).toBe(false);
  });
});

describe("normalizarMes / deslocarMes", () => {
  it("aceita YYYY-MM válido e cai no mês atual caso contrário", () => {
    expect(normalizarMes("2026-02", AGORA)).toBe("2026-02");
    for (const invalido of [undefined, null, "", "2026-13", "2026-00", "abc", "2026-1", "1500-01"]) {
      expect(normalizarMes(invalido, AGORA)).toBe("2026-11");
    }
  });

  it("cruza a virada de ano nos dois sentidos", () => {
    expect(deslocarMes("2026-12", 1)).toBe("2027-01");
    expect(deslocarMes("2026-01", -1)).toBe("2025-12");
    expect(deslocarMes("2026-06", 0)).toBe("2026-06");
  });
});

describe("intervaloDoMes", () => {
  it("bordas no fuso de Brasília, com fim exclusivo", () => {
    const { inicio, fim } = intervaloDoMes("2026-12");
    expect(inicio.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });
});

describe("rotuloMesExtenso", () => {
  it("usa o mês de Brasília na virada de ano", () => {
    expect(rotuloMesExtenso("2027-01")).toBe("janeiro de 2027");
  });
});

describe("parseFiltrosDespesas", () => {
  it("descarta valores desconhecidos vindos da URL", () => {
    expect(
      parseFiltrosDespesas(
        { mes: "xx", categorias: "ENERGIA,XPTO", status: "PAGO,ATRASADO", q: "  luz " },
        AGORA,
      ),
    ).toEqual({ mes: "2026-11", categorias: ["ENERGIA"], status: ["PAGO"], q: "luz" });
  });

  it("sem parâmetros, aplica só o mês atual", () => {
    expect(parseFiltrosDespesas({}, AGORA)).toEqual({
      mes: "2026-11",
      categorias: [],
      status: [],
      q: "",
    });
  });
});

describe("resumirDespesasMes", () => {
  const linhas = [
    linha({ categoria: "ENERGIA", valor: 300, status: "PAGO", pagoEm: AGORA }),
    linha({ categoria: "EQUIPAMENTO", valor: 700 }),
    linha({ categoria: "ENERGIA", valor: 200.1 }),
    // Outubro, pendente: fora do mês, mas conta no atraso.
    linha({ valor: 50, data: new Date("2026-10-20T15:00:00Z") }),
  ];

  it("soma só o mês selecionado e separa pago de a pagar", () => {
    const r = resumirDespesasMes(linhas, "2026-11", AGORA);
    expect(r).toMatchObject({ total: 1200.1, pago: 300, aPagar: 900.1, qtd: 3 });
  });

  it("atraso considera qualquer mês e ignora o que ainda vai vencer", () => {
    const r = resumirDespesasMes(linhas, "2026-11", AGORA);
    expect(r.atrasado).toBe(50);
    expect(r.qtdAtrasadas).toBe(1);
  });

  it("categorias em ordem de valor, sem as vazias", () => {
    const r = resumirDespesasMes(linhas, "2026-11", AGORA);
    expect(r.porCategoria.map((c) => [c.categoria, c.valor, c.qtd, c.pct])).toEqual([
      ["EQUIPAMENTO", 700, 1, 58],
      ["ENERGIA", 500.1, 2, 42],
    ]);
  });

  it("agrupa pelo mês de Brasília, não de UTC", () => {
    // 01/12 01:00 UTC = 30/11 22:00 em Brasília.
    const r = resumirDespesasMes(
      [linha({ valor: 10, data: new Date("2026-12-01T01:00:00Z") })],
      "2026-11",
      AGORA,
    );
    expect(r.total).toBe(10);
  });

  it("mês sem despesas zera tudo", () => {
    expect(resumirDespesasMes([], "2026-11", AGORA)).toMatchObject({
      total: 0,
      qtd: 0,
      porCategoria: [],
    });
  });
});

describe("compararReceitaDespesa", () => {
  const receita = [
    { mes: "2026-10", recebido: 5000 },
    { mes: "2026-11", recebido: 2000 },
  ];

  it("despesa paga entra no mês do pagamento, não no da data", () => {
    const c = compararReceitaDespesa(
      receita,
      0,
      [
        linha({
          valor: 400,
          status: "PAGO",
          data: new Date("2026-10-20T15:00:00Z"),
          pagoEm: new Date("2026-11-02T15:00:00Z"),
        }),
      ],
      AGORA,
    );
    expect(c.porMes.find((m) => m.mes === "2026-10")?.despesa).toBe(0);
    expect(c.porMes.find((m) => m.mes === "2026-11")).toMatchObject({
      receita: 2000,
      despesa: 400,
      saldo: 1600,
    });
  });

  it("saldo realizado e previsto do mês", () => {
    const c = compararReceitaDespesa(
      receita,
      1000,
      [
        linha({ valor: 500, status: "PAGO", pagoEm: AGORA }),
        linha({ valor: 300, data: new Date("2026-11-28T15:00:00Z") }),
        linha({ valor: 200, data: new Date("2026-09-10T15:00:00Z") }), // atrasada antiga conta
        linha({ valor: 999, data: new Date("2026-12-05T15:00:00Z") }), // mês que vem não conta
      ],
      AGORA,
    );
    expect(c.mes).toEqual({
      recebido: 2000,
      despesasPagas: 500,
      saldo: 1500,
      aReceber: 1000,
      aPagar: 500,
      saldoPrevisto: 2000,
      comprometimentoPct: 25,
    });
  });

  it("saldo fica negativo quando a despesa supera a receita", () => {
    const c = compararReceitaDespesa(
      [{ mes: "2026-11", recebido: 100 }],
      0,
      [linha({ valor: 350.5, status: "PAGO", pagoEm: AGORA })],
      AGORA,
    );
    expect(c.mes.saldo).toBe(-250.5);
    expect(c.mes.comprometimentoPct).toBe(351);
  });

  it("sem receita, o comprometimento é null em vez de divisão por zero", () => {
    const c = compararReceitaDespesa([], 0, [], AGORA);
    expect(c.mes.comprometimentoPct).toBeNull();
    expect(c.porMes).toHaveLength(12);
    expect(c.porMes[11].mes).toBe("2026-11");
  });

  it("despesa paga fora da janela de 12 meses não aparece na série", () => {
    const c = compararReceitaDespesa(
      [],
      0,
      [linha({ valor: 80, status: "PAGO", pagoEm: new Date("2025-01-10T15:00:00Z") })],
      AGORA,
    );
    expect(c.porMes.every((m) => m.despesa === 0)).toBe(true);
  });
});
