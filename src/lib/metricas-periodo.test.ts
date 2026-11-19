import { describe, expect, it } from "vitest";
import {
  diaDaMetrica,
  excedeRetencaoBrutos,
  intervaloPeriodo,
  limitePurga,
  parsePeriodo,
} from "./metricas-periodo";

describe("parsePeriodo", () => {
  it("aceita só a whitelist e cai no padrão 30", () => {
    expect(parsePeriodo("7")).toBe(7);
    expect(parsePeriodo("90")).toBe(90);
    expect(parsePeriodo("365")).toBe(365);
    expect(parsePeriodo("15")).toBe(30);
    expect(parsePeriodo("abc")).toBe(30);
    expect(parsePeriodo("-7")).toBe(30);
    expect(parsePeriodo(undefined)).toBe(30);
    expect(parsePeriodo(["7", "90"])).toBe(7);
  });
});

describe("diaDaMetrica", () => {
  it("23:30 de Brasília (02:30 UTC do dia seguinte) cai no dia de Brasília", () => {
    const d = new Date("2026-03-31T02:30:00.000Z"); // 30/03 23:30 em Brasília
    expect(diaDaMetrica(d).toISOString()).toBe("2026-03-30T00:00:00.000Z");
  });

  it("00:10 de Brasília cai no dia novo (virada de ano)", () => {
    const d = new Date("2027-01-01T03:10:00.000Z"); // 01/01 00:10 em Brasília
    expect(diaDaMetrica(d).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("02:59 UTC ainda é o dia anterior em Brasília", () => {
    const d = new Date("2027-01-01T02:59:00.000Z");
    expect(diaDaMetrica(d).toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });
});

describe("intervaloPeriodo", () => {
  it("7 dias incluem hoje: começa 6 dias antes, à meia-noite de Brasília", () => {
    const agora = new Date("2026-11-18T15:00:00.000Z"); // 18/11 12:00 em Brasília
    const { inicio, diaInicio, diaFim } = intervaloPeriodo(7, agora);
    expect(inicio.toISOString()).toBe("2026-11-12T03:00:00.000Z");
    expect(diaInicio.toISOString()).toBe("2026-11-12T00:00:00.000Z");
    expect(diaFim.toISOString()).toBe("2026-11-18T00:00:00.000Z");
  });

  it("atravessa virada de mês e de ano", () => {
    const agora = new Date("2027-01-03T12:00:00.000Z");
    const { diaInicio } = intervaloPeriodo(7, agora);
    expect(diaInicio.toISOString()).toBe("2026-12-28T00:00:00.000Z");
  });

  it("logo após a meia-noite de Brasília o dia de hoje já conta", () => {
    const agora = new Date("2026-11-18T03:05:00.000Z"); // 18/11 00:05 em Brasília
    const { diaInicio, diaFim } = intervaloPeriodo(1, agora);
    expect(diaInicio.toISOString()).toBe("2026-11-18T00:00:00.000Z");
    expect(diaFim.toISOString()).toBe("2026-11-18T00:00:00.000Z");
  });
});

describe("retenção", () => {
  it("limitePurga é agora − 90 dias", () => {
    const agora = new Date("2026-11-18T12:00:00.000Z");
    expect(limitePurga(agora).toISOString()).toBe("2026-08-20T12:00:00.000Z");
  });

  it("só 365 dias excede a retenção dos brutos", () => {
    expect(excedeRetencaoBrutos(90)).toBe(false);
    expect(excedeRetencaoBrutos(365)).toBe(true);
  });
});
