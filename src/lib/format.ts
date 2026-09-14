import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

// A clínica opera em horário de Brasília; toda formatação de data/hora passa pelo
// `date-fns-tz` (nunca `Intl.DateTimeFormat`/`toLocale*` espalhado pelo código, nem
// parsing manual de string com offset) para o resultado não depender de onde o
// código roda (servidor em UTC na Vercel, navegador do usuário, etc.). Ver a seção
// "Fuso horário" do CLAUDE.md — o lint (`eslint.config.mjs`) bloqueia uso cru dessas
// APIs fora deste arquivo.
export const TIMEZONE = "America/Sao_Paulo";

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/** "setembro" — nome do mês por extenso. */
export function formatarMes(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "MMMM", { locale: ptBR });
}

export function formatarData(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "dd/MM/yyyy");
}

export function formatarDataHora(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "dd/MM/yyyy HH:mm");
}

/** Igual a `formatarDataHora`, mas com segundos — usado na trilha de auditoria (/logs). */
export function formatarDataHoraSegundos(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "dd/MM/yyyy HH:mm:ss");
}

/** "14 de setembro" — dia + mês por extenso, sem dia da semana nem hora. */
export function formatarDiaMes(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "dd 'de' MMMM", { locale: ptBR });
}

/** "14/09, 10:30" — dia/mês numérico + hora, para mensagens curtas de conflito. */
export function formatarDiaMesHora(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "dd/MM, HH:mm");
}

/** "segunda-feira, 14 de setembro" — data por extenso, sem hora. */
export function formatarDataExtenso(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

/** "Segunda-feira, 14/09, 10:30" — data por extenso + hora. */
export function formatarDataHoraExtenso(data: Date) {
  const s = formatInTimeZone(data, TIMEZONE, "EEEE dd/MM HH:mm", { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Apenas o horário (HH:mm), no fuso da clínica — para exibir intervalos de evento
 * (ex. "10:00 – 11:00"). Equivalente de exibição de `toTimeInputValue`.
 */
export function formatarHora(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "HH:mm");
}

/**
 * Formata um campo de **data pura** (sem hora relevante, ex. `Paciente.dataNascimento`,
 * `Feriado.data @db.Date`) — esses campos são gravados como meia-noite UTC a partir de
 * um `<input type="date">`, então formatar no fuso de Brasília mostraria o dia anterior.
 * Sempre usar o fuso "UTC" aqui, nunca `TIMEZONE`.
 */
export function formatarDataSemHora(
  data: Date | string,
  dateStyle: "short" | "long" = "short",
) {
  const pattern = dateStyle === "long" ? "dd 'de' MMMM 'de' yyyy" : "dd/MM/yyyy";
  return formatInTimeZone(new Date(data), "UTC", pattern, { locale: ptBR });
}

/** Reformata uma string "YYYY-MM-DD" para "DD/MM/YYYY" sem passar por `Date`/fuso. */
export function formatarYmd(ymd: string) {
  const [ano, mes, dia] = ymd.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Valor para <input type="date"> (YYYY-MM-DD) no fuso da clínica. */
export function toDateInputValue(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "yyyy-MM-dd");
}

/** Valor para <input type="time"> (HH:mm) no fuso da clínica. */
export function toTimeInputValue(data: Date) {
  return formatInTimeZone(data, TIMEZONE, "HH:mm");
}

/** A hora do dia (0-23) no fuso da clínica — para agrupar eventos por faixa horária. */
export function horaDoDia(data: Date) {
  return Number(formatInTimeZone(data, TIMEZONE, "H"));
}
