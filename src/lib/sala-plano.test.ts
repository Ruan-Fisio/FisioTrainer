import { describe, expect, it } from "vitest";
import {
  escolherSalaComVaga,
  tipoOcupacaoAgendamento,
  vagasTotais,
  type SalaCandidata,
} from "./sala-plano";

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

  it("pula sala bloqueada por outra modalidade mesmo com vaga numérica", () => {
    // Sala 2 está livre (0 ocupada) mas tem agendamento de outra modalidade no horário.
    const escolhida = escolherSalaComVaga(salas, {}, 1, new Set(["s2"]));
    expect(escolhida?.salaId).toBe("s3");
  });

  it("retorna null quando todas as candidatas estão bloqueadas por outra modalidade", () => {
    const escolhida = escolherSalaComVaga(salas, {}, 1, new Set(["s2", "s3"]));
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

  it("não soma vaga de sala bloqueada por outra modalidade", () => {
    // Sala 2 (capacidade 1) bloqueada; só a Sala 3 (capacidade 2) entra na soma.
    expect(vagasTotais(salas, {}, new Set(["s2"]))).toBe(2);
    expect(vagasTotais(salas, {}, new Set(["s2", "s3"]))).toBe(0);
  });
});

describe("tipoOcupacaoAgendamento", () => {
  it("usa a própria modalidade como chave para as modalidades fixas", () => {
    expect(tipoOcupacaoAgendamento("FISIOTERAPIA")).toBe("FISIOTERAPIA");
    expect(tipoOcupacaoAgendamento("EDUCACAO_FISICA")).toBe("EDUCACAO_FISICA");
    expect(tipoOcupacaoAgendamento("AVALIACAO")).toBe("AVALIACAO");
  });

  it("diferencia serviços customizados diferentes (OUTRO) pelo servicoId", () => {
    const psicologia = tipoOcupacaoAgendamento("OUTRO", "servico-psicologia");
    const nutricao = tipoOcupacaoAgendamento("OUTRO", "servico-nutricao");
    expect(psicologia).not.toBe(nutricao);
  });

  it("dois agendamentos do mesmo serviço customizado têm a mesma chave", () => {
    expect(tipoOcupacaoAgendamento("OUTRO", "servico-psicologia")).toBe(
      tipoOcupacaoAgendamento("OUTRO", "servico-psicologia"),
    );
  });

  it("nunca colide a chave de um serviço customizado com uma modalidade fixa", () => {
    expect(tipoOcupacaoAgendamento("OUTRO", "FISIOTERAPIA")).not.toBe("FISIOTERAPIA");
  });
});
