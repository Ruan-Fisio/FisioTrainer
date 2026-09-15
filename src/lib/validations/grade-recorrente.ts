import { z } from "zod";

export const diaSemanaValues = [
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
  "DOMINGO",
] as const;

export const modalidadeAgendamentoValues = [
  "EDUCACAO_FISICA",
  "FISIOTERAPIA",
  "AVALIACAO",
  "TERAPIA_MANUAL",
] as const;

export const gradeRecorrenteLinhaSchema = z.object({
  modalidade: z.enum(modalidadeAgendamentoValues),
  diaSemana: z.enum(diaSemanaValues),
  horario: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  profissionalId: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
});

export const gradeRecorrenteSchema = z
  .object({
    linhas: z.array(gradeRecorrenteLinhaSchema).max(21, "Grade muito longa"),
  })
  .superRefine((data, ctx) => {
    const vistos = new Set<string>();
    data.linhas.forEach((l, i) => {
      const chave = `${l.modalidade}|${l.diaSemana}|${l.horario}`;
      if (vistos.has(chave)) {
        ctx.addIssue({
          code: "custom",
          message: "Há dias repetidos na grade (mesma modalidade, dia e horário).",
          path: ["linhas", i],
        });
      }
      vistos.add(chave);
    });
  });

export type GradeRecorrenteLinha = z.infer<typeof gradeRecorrenteLinhaSchema>;
export type ModalidadeGradeRecorrente = (typeof modalidadeAgendamentoValues)[number];
