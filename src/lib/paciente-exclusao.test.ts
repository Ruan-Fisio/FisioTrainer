import { describe, expect, it } from "vitest";
import { planejarAgendamentosDaExclusao } from "./paciente-exclusao";

describe("planejarAgendamentosDaExclusao", () => {
  it("cancela quando era o único paciente e só desvincula em grupo", () => {
    expect(
      planejarAgendamentosDaExclusao([
        { id: "sozinho", totalPacientes: 1 },
        { id: "grupo", totalPacientes: 3 },
      ]),
    ).toEqual({ cancelar: ["sozinho"], desvincular: ["grupo"] });
  });

  it("sem agendamentos não faz nada", () => {
    expect(planejarAgendamentosDaExclusao([])).toEqual({ cancelar: [], desvincular: [] });
  });
});
