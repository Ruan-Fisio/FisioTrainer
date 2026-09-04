import { describe, expect, it } from "vitest";
import { gerarOcorrencias, LIMITE_OCORRENCIAS } from "./recorrencia";

describe("gerarOcorrencias", () => {
  it("gera ocorrências diárias respeitando o intervalo", () => {
    const inicio = new Date("2026-09-01T10:00:00");
    const ocorrencias = gerarOcorrencias(inicio, {
      intervalo: 2,
      unidade: "DIA",
      termino: "APOS_N",
      terminoOcorrencias: 3,
    });
    expect(ocorrencias.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-09-01",
      "2026-09-03",
      "2026-09-05",
    ]);
  });

  it("gera ocorrências semanais em dias específicos, incluindo semanas puladas por intervalo", () => {
    // 2026-09-01 é uma terça-feira
    const inicio = new Date("2026-09-01T14:00:00");
    const ocorrencias = gerarOcorrencias(inicio, {
      intervalo: 2,
      unidade: "SEMANA",
      diasSemana: [2, 4], // terça e quinta
      termino: "APOS_N",
      terminoOcorrencias: 4,
    });
    expect(ocorrencias.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-09-01", // terça, semana 0
      "2026-09-03", // quinta, semana 0
      "2026-09-15", // terça, semana 2 (semana 1 pulada)
      "2026-09-17", // quinta, semana 2
    ]);
  });

  it("preserva o horário original em todas as ocorrências", () => {
    const inicio = new Date("2026-09-01T14:30:00");
    const ocorrencias = gerarOcorrencias(inicio, {
      intervalo: 1,
      unidade: "MES",
      termino: "APOS_N",
      terminoOcorrencias: 3,
    });
    for (const data of ocorrencias) {
      expect(data.getHours()).toBe(14);
      expect(data.getMinutes()).toBe(30);
    }
  });

  it("respeita data de término explícita", () => {
    const inicio = new Date("2026-09-01T10:00:00");
    const ocorrencias = gerarOcorrencias(inicio, {
      intervalo: 1,
      unidade: "SEMANA",
      termino: "EM_DATA",
      terminoData: new Date("2026-09-20T23:59:59"),
    });
    expect(ocorrencias.length).toBe(3);
    expect(ocorrencias[ocorrencias.length - 1].toISOString().slice(0, 10)).toBe(
      "2026-09-15",
    );
  });

  it("aplica teto de segurança quando o término é NUNCA", () => {
    const inicio = new Date("2026-01-01T10:00:00");
    const ocorrencias = gerarOcorrencias(inicio, {
      intervalo: 1,
      unidade: "DIA",
      termino: "NUNCA",
    });
    expect(ocorrencias.length).toBe(LIMITE_OCORRENCIAS);
  });

  it("lida com recorrência mensal em fim de mês sem estourar para o mês seguinte de forma inconsistente", () => {
    const inicio = new Date("2026-01-31T09:00:00");
    const ocorrencias = gerarOcorrencias(inicio, {
      intervalo: 1,
      unidade: "MES",
      termino: "APOS_N",
      terminoOcorrencias: 2,
    });
    expect(ocorrencias[0].toISOString().slice(0, 10)).toBe("2026-01-31");
    // date-fns addMonths ajusta (clampa) para o último dia de fevereiro
    expect(ocorrencias[1].toISOString().slice(0, 10)).toBe("2026-02-28");
  });
});
