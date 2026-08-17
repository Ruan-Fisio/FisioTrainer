export const TIPO_AGENDAMENTO_LABEL: Record<string, string> = {
  RETORNO: "Retorno / Reavaliação",
  AVALIACAO: "Avaliação",
  SESSAO: "Sessão",
};

export const STATUS_AGENDAMENTO_LABEL: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  AGENDADO: { label: "Agendado", variant: "default" },
  COMPARECEU: { label: "Compareceu", variant: "secondary" },
  FALTOU: { label: "Faltou", variant: "destructive" },
  CANCELADO: { label: "Cancelado", variant: "outline" },
};
