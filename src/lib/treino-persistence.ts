import { prisma } from "@/lib/prisma";
import type { treinoSchema } from "@/lib/validations/treino";

type TreinoFormData = ReturnType<typeof treinoSchema.parse>;
type ExercicioInput = TreinoFormData["dias"][number]["exercicios"][number];

const idsMantidos = <T extends { id?: string }>(itens: T[]) =>
  itens.map((i) => i.id).filter((v): v is string => Boolean(v));

const exercicioData = (ex: ExercicioInput, ordem: number) => ({
  exercicioId: ex.exercicioId,
  ordem,
  series: ex.series ?? null,
  repeticoes: ex.repeticoes || null,
  carga: ex.carga ?? null,
  descanso: ex.descanso ?? null,
  instrucoes: ex.instrucoes || null,
});

/**
 * Atualiza um treino (modelo ou de paciente) preservando os IDs de dia e
 * exercício existentes sempre que possível — só apaga o que o usuário removeu
 * do formulário.
 *
 * Enviado como um único nested write do Prisma (`treino.update` com
 * `deleteMany`/`update`/`create` aninhados). É atômico, não usa transação
 * interativa (que estourava o timeout de 5s no pooler do Neon — erro P2028)
 * e faz bem menos round-trips.
 */
export async function updateTreinoInPlace(id: string, data: TreinoFormData) {
  const existente = await prisma.treino.findUniqueOrThrow({
    where: { id },
    include: { dias: { include: { exercicios: true } } },
  });

  await prisma.treino.update({
    where: { id },
    data: {
      nome: data.nome,
      descricao: data.descricao || null,
      dias: {
        deleteMany:
          idsMantidos(data.dias).length > 0
            ? { id: { notIn: idsMantidos(data.dias) } }
            : {},
        update: data.dias.flatMap((dia, diaIndex) => {
          const diaExistente = existente.dias.find((d) => d.id === dia.id);
          if (!diaExistente) return [];
          const exsMantidos = idsMantidos(dia.exercicios);
          return [
            {
              where: { id: diaExistente.id },
              data: {
                diaSemana: dia.diaSemana,
                ordem: diaIndex,
                exercicios: {
                  deleteMany:
                    exsMantidos.length > 0
                      ? { id: { notIn: exsMantidos } }
                      : {},
                  update: dia.exercicios.flatMap((ex, i) => {
                    const atual = diaExistente.exercicios.find(
                      (e) => e.id === ex.id,
                    );
                    return atual
                      ? [
                          {
                            where: { id: atual.id },
                            data: exercicioData(ex, i),
                          },
                        ]
                      : [];
                  }),
                  create: dia.exercicios.flatMap((ex, i) => {
                    const atual = diaExistente.exercicios.find(
                      (e) => e.id === ex.id,
                    );
                    return atual ? [] : [exercicioData(ex, i)];
                  }),
                },
              },
            },
          ];
        }),
        create: data.dias.flatMap((dia, diaIndex) => {
          const diaExistente = existente.dias.find((d) => d.id === dia.id);
          return diaExistente
            ? []
            : [
                {
                  diaSemana: dia.diaSemana,
                  ordem: diaIndex,
                  exercicios: {
                    create: dia.exercicios.map((ex, i) => exercicioData(ex, i)),
                  },
                },
              ];
        }),
      },
    },
  });
}
