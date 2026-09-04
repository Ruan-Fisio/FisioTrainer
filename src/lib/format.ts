// A clínica opera em horário de Brasília; toda formatação de data/hora é ancorada
// nesse fuso para o resultado não depender de onde o código roda (servidor em UTC
// na Vercel, navegador do usuário, etc.).
const TIMEZONE = "America/Sao_Paulo";

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: TIMEZONE,
  }).format(data);
}

export function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TIMEZONE,
  }).format(data);
}

/** Valor para <input type="date"> (YYYY-MM-DD) no fuso da clínica. */
export function toDateInputValue(data: Date) {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(data);
}

/** Valor para <input type="time"> (HH:mm) no fuso da clínica. */
export function toTimeInputValue(data: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIMEZONE,
  }).format(data);
}

/** A hora do dia (0-23) no fuso da clínica — para agrupar eventos por faixa horária. */
export function horaDoDia(data: Date) {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: TIMEZONE,
    }).format(data),
  );
}
