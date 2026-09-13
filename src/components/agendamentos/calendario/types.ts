import type { ModalidadeAgendamento } from "@/generated/prisma/enums";

export type EventoCalendario = {
  id: string;
  titulo: string;
  dataInicio: Date;
  dataFim: Date;
  diaInteiro: boolean;
  modalidade: ModalidadeAgendamento;
  status: string;
  serieId: string | null;
  planoAtribuicaoId: string | null;
  pacientes: { id: string; nome: string }[];
  profissional: { id: string; name: string } | null;
  sala: { id: string; nome: string } | null;
};
