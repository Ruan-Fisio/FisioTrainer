import { describe, expect, it } from "vitest";
import {
  HORAS_ANTECEDENCIA_CANCELAMENTO,
  pacientePodeDesmarcar,
} from "./agendamento-cancelamento";

const agora = new Date("2026-09-03T12:00:00");
const H = 60 * 60 * 1000;

describe("pacientePodeDesmarcar", () => {
  it("permite quando falta bem mais que o prazo", () => {
    expect(pacientePodeDesmarcar(new Date(agora.getTime() + 24 * H), agora)).toBe(true);
  });

  it("permite exatamente no limite (2h antes)", () => {
    const inicio = new Date(agora.getTime() + HORAS_ANTECEDENCIA_CANCELAMENTO * H);
    expect(pacientePodeDesmarcar(inicio, agora)).toBe(true);
  });

  it("bloqueia um minuto dentro do prazo (1h59 antes)", () => {
    const inicio = new Date(
      agora.getTime() + HORAS_ANTECEDENCIA_CANCELAMENTO * H - 60 * 1000,
    );
    expect(pacientePodeDesmarcar(inicio, agora)).toBe(false);
  });

  it("bloqueia quando o horário já passou", () => {
    expect(pacientePodeDesmarcar(new Date(agora.getTime() - H), agora)).toBe(false);
  });
});
