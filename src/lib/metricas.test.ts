import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { registrarEvento, type ClienteMetricas } from "./metricas";

function clienteFake(overrides: Partial<ClienteMetricas> = {}) {
  const create = vi.fn().mockResolvedValue({});
  const executeRaw = vi.fn().mockResolvedValue(1);
  const cliente = {
    eventoUso: { create },
    $executeRaw: executeRaw,
    ...overrides,
  } as unknown as ClienteMetricas;
  return { cliente, create, executeRaw };
}

describe("registrarEvento", () => {
  it("grava o bruto e incrementa o agregado do dia de Brasília", async () => {
    const { cliente, create, executeRaw } = clienteFake();
    const agora = new Date("2026-03-31T02:30:00.000Z"); // 30/03 23:30 em Brasília
    const ok = await registrarEvento(
      { area: "CLINICA", tipo: "TELA", chave: "/pacientes/[id]", usuarioId: "u1" },
      { agora, cliente },
    );
    expect(ok).toBe(true);
    expect(create).toHaveBeenCalledWith({
      data: { criadoEm: agora, area: "CLINICA", tipo: "TELA", chave: "/pacientes/[id]", usuarioId: "u1" },
    });
    // 2º argumento do template = id; 3º = dia
    expect((executeRaw.mock.calls[0][2] as Date).toISOString()).toBe("2026-03-30T00:00:00.000Z");
  });

  it("nunca grava usuarioId fora da área CLINICA (RN3)", async () => {
    const { cliente, create } = clienteFake();
    await registrarEvento(
      { area: "PORTAL", tipo: "TELA", chave: "/compartilhado/paciente/[id]", usuarioId: "u1" },
      { cliente },
    );
    expect(create.mock.calls[0][0].data.usuarioId).toBeNull();
  });

  it("não lança quando o banco falha (CA9)", async () => {
    const { cliente } = clienteFake({
      eventoUso: { create: vi.fn().mockRejectedValue(new Error("db fora")) },
    });
    await expect(
      registrarEvento({ area: "CLINICA", tipo: "ACAO", chave: "login" }, { cliente }),
    ).resolves.toBe(false);
  });

  it("não lança quando o incremento do agregado falha", async () => {
    const { cliente } = clienteFake({ $executeRaw: vi.fn().mockRejectedValue(new Error("x")) });
    await expect(
      registrarEvento({ area: "PRE_CADASTRO", tipo: "TELA", chave: "/pre-cadastro" }, { cliente }),
    ).resolves.toBe(false);
  });
});
