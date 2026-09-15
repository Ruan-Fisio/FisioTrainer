export const MODALIDADE_AGENDAMENTO_LABEL: Record<string, string> = {
  EDUCACAO_FISICA: "Educação Física",
  FISIOTERAPIA: "Fisioterapia",
  AVALIACAO: "Avaliação",
  TERAPIA_MANUAL: "Terapia Manual",
  OUTRO: "Outro",
};

/**
 * Rótulo de exibição de um agendamento de Serviço customizado (`modalidade === "OUTRO"`):
 * usa o nome do serviço (ex. "Psicologia") em vez do rótulo genérico "Outro", que só
 * aparece como fallback (serviço excluído/sem relação carregada) ou nos filtros
 * agregados (`MODALIDADE_AGENDAMENTO_LABEL`, que não sabe qual serviço específico é).
 */
export function modalidadeAgendamentoLabel(modalidade: string, servicoNome?: string | null) {
  if (modalidade === "OUTRO") return servicoNome ?? MODALIDADE_AGENDAMENTO_LABEL.OUTRO;
  return MODALIDADE_AGENDAMENTO_LABEL[modalidade] ?? modalidade;
}

export const STATUS_AGENDAMENTO_LABEL: Record<string, { label: string; className: string }> = {
  AGENDADO: {
    label: "Agendado",
    className: "border-transparent bg-primary/10 text-primary",
  },
  COMPARECEU: {
    label: "Compareceu",
    className:
      "border-transparent bg-green-600/10 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  },
  FALTOU: {
    label: "Faltou",
    className: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
  },
  CANCELADO: {
    label: "Cancelado",
    className: "border-border text-muted-foreground",
  },
};

export const REPETICAO_LABEL: Record<string, string> = {
  NAO_REPETE: "Não se repete",
  DIARIA: "Diariamente",
  SEMANAL: "Semanalmente",
  MENSAL: "Mensalmente",
  ANUAL: "Anualmente",
  PERSONALIZADA: "Personalizado...",
};

export const UNIDADE_RECORRENCIA_LABEL: Record<string, { singular: string; plural: string }> = {
  DIA: { singular: "dia", plural: "dias" },
  SEMANA: { singular: "semana", plural: "semanas" },
  MES: { singular: "mês", plural: "meses" },
  ANO: { singular: "ano", plural: "anos" },
};

export const DIA_SEMANA_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"];
