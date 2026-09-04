/**
 * Limites de dia/semana/mês no fuso da clínica (America/Sao_Paulo, UTC-3 fixo),
 * calculados sem depender do fuso do processo — na Vercel o runtime das server
 * actions pode continuar em UTC mesmo com `process.env.TZ` no next.config, e aí
 * `date-fns` calcularia as bordas no dia errado.
 */

const OFFSET = "-03:00";

/** "YYYY-MM-DD" do instante no fuso da clínica. */
function ymdBrasilia(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Dia da semana (0=domingo) da data-calendário "YYYY-MM-DD". */
function diaDaSemana(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

function somarDias(ymd: string, dias: number): string {
  const base = new Date(`${ymd}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

export function inicioDoDia(d: Date = new Date()): Date {
  return new Date(`${ymdBrasilia(d)}T00:00:00.000${OFFSET}`);
}

export function fimDoDia(d: Date = new Date()): Date {
  return new Date(`${ymdBrasilia(d)}T23:59:59.999${OFFSET}`);
}

/** Fim do sábado da semana que contém `d` (semana começa no domingo). */
export function fimDaSemana(d: Date = new Date()): Date {
  const ymd = ymdBrasilia(d);
  const sabado = somarDias(ymd, 6 - diaDaSemana(ymd));
  return new Date(`${sabado}T23:59:59.999${OFFSET}`);
}

/** Primeiro instante do mês que contém `d`. */
export function inicioDoMes(d: Date = new Date()): Date {
  const [ano, mes] = ymdBrasilia(d).split("-");
  return new Date(`${ano}-${mes}-01T00:00:00.000${OFFSET}`);
}

/** Fim do último dia do mês que contém `d`. */
export function fimDoMes(d: Date = new Date()): Date {
  const [ano, mes] = ymdBrasilia(d).split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const ymd = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  return new Date(`${ymd}T23:59:59.999${OFFSET}`);
}

/** Primeiro instante do mês seguinte ao que contém `d`. */
export function inicioDoProximoMes(d: Date = new Date()): Date {
  const [ano, mes] = ymdBrasilia(d).split("-").map(Number);
  const anoProx = mes === 12 ? ano + 1 : ano;
  const mesProx = mes === 12 ? 1 : mes + 1;
  return new Date(
    `${anoProx}-${String(mesProx).padStart(2, "0")}-01T00:00:00.000${OFFSET}`,
  );
}
