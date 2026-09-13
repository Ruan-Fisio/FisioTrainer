import { describe, expect, it } from "vitest";
import { escolherSalaComVaga, vagasTotais, type SalaCandidata } from "./sala-plano";

const salas: SalaCandidata[] = [
  { salaId: "s2", nome: "Sala 2", capacidade: 1 },
  { salaId: "s3", nome: "Sala 3", capacidade: 2 },
];

describe("escolherSalaComVaga", () => {
  it("escolhe a primeira candidata com vaga, respeitando a ordem", () => {
    const escolhida = escolherSalaComVaga(salas, {}, 1);
    expect(escolhida?.salaId).toBe("s2");
  });

  it("pula pra próxima candidata quando a primeira está lotada", () => {
    const escolhida = escolherSalaComVaga(salas, { s2: 1 }, 1);
    expect(escolhida?.salaId).toBe("s3");
  });

  it("retorna null quando todas as candidatas estão lotadas", () => {
    const escolhida = escolherSalaComVaga(salas, { s2: 1, s3: 2 }, 1);
    expect(escolhida).toBeNull();
  });

  it("retorna null quando não há candidatas (plano sem sala configurada)", () => {
    expect(escolherSalaComVaga([], {}, 1)).toBeNull();
  });

  it("trata quantidade zero/negativa como pelo menos 1 paciente", () => {
    const escolhida = escolherSalaComVaga(salas, { s2: 1 }, 0);
    expect(escolhida?.salaId).toBe("s3");
  });

  it("considera o total de pacientes do evento, não 1 por evento", () => {
    // Sala 3 tem capacidade 2; um evento pedindo 2 vagas de uma vez não cabe se já tem 1 ocupada.
    const escolhida = escolherSalaComVaga(salas, { s3: 1 }, 2);
    expect(escolhida).toBeNull();
  });
});

describe("vagasTotais", () => {
  it("soma as vagas livres de todas as candidatas", () => {
    expect(vagasTotais(salas, {})).toBe(3);
    expect(vagasTotais(salas, { s2: 1, s3: 1 })).toBe(1);
  });

  it("nunca soma vaga negativa quando a sala está sobrelotada", () => {
    expect(vagasTotais(salas, { s2: 5 })).toBe(2);
  });

  it("é 0 sem candidatas", () => {
    expect(vagasTotais([], {})).toBe(0);
  });
});
