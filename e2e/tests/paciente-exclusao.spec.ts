import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "../test-db";
import { nomeUnico } from "../fixtures/nomes";

const HORA = 60 * 60 * 1000;

test("excluir paciente libera a agenda sem apagar histórico nem atingir outros pacientes", async ({
  page,
}) => {
  const db = new Client({ connectionString: TEST_DATABASE_URL });
  await db.connect();
  try {
    const criarPaciente = async (prefixo: string) => {
      const id = randomUUID();
      const nome = nomeUnico(prefixo);
      await db.query(
        `INSERT INTO "Paciente" (id, nome, "updatedAt") VALUES ($1, $2, now())`,
        [id, nome],
      );
      return { id, nome };
    };
    const criarAgendamento = async (
      titulo: string,
      emHoras: number,
      pacienteIds: string[],
      status = "AGENDADO",
    ) => {
      const id = randomUUID();
      await db.query(
        `INSERT INTO "Agendamento" (id, titulo, status, "dataInicio", "dataFim", "updatedAt")
         VALUES ($1, $2, $3::"StatusAgendamento", $4, $5, now())`,
        [
          id,
          titulo,
          status,
          new Date(Date.now() + emHoras * HORA),
          new Date(Date.now() + (emHoras + 1) * HORA),
        ],
      );
      for (const pacienteId of pacienteIds) {
        await db.query(`INSERT INTO "_AgendamentoToPaciente" ("A", "B") VALUES ($1, $2)`, [
          id,
          pacienteId,
        ]);
      }
      return id;
    };
    const ler = async (id: string) => {
      const a = await db.query<{ status: string }>(
        `SELECT status FROM "Agendamento" WHERE id = $1`,
        [id],
      );
      const p = await db.query<{ B: string }>(
        `SELECT "B" FROM "_AgendamentoToPaciente" WHERE "A" = $1`,
        [id],
      );
      return { status: a.rows[0].status, pacientes: p.rows.map((l) => l.B) };
    };

    const excluido = await criarPaciente("Excluido");
    const colega = await criarPaciente("Colega");
    const sozinho = await criarAgendamento("excl-sozinho", 48, [excluido.id]);
    const grupo = await criarAgendamento("excl-grupo", 72, [excluido.id, colega.id]);
    const passado = await criarAgendamento("excl-passado", -48, [excluido.id], "COMPARECEU");
    const avulso = await criarAgendamento("excl-avulso", 96, []);

    await page.goto(`/pacientes?q=${encodeURIComponent(excluido.nome)}`);
    await page.getByRole("button", { name: "Excluir" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByText("Paciente excluído com sucesso.")).toBeVisible();

    // Futuro de um paciente só: cancelado, mas a linha e o vínculo continuam.
    expect(await ler(sozinho)).toEqual({ status: "CANCELADO", pacientes: [excluido.id] });
    // Grupo: segue acontecendo para quem ficou.
    expect(await ler(grupo)).toEqual({ status: "AGENDADO", pacientes: [colega.id] });
    // Passado: histórico intacto.
    expect(await ler(passado)).toEqual({ status: "COMPARECEU", pacientes: [excluido.id] });
    expect((await ler(avulso)).status).toBe("AGENDADO");
  } finally {
    await db.end();
  }
});
