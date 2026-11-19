/**
 * Montagem pura dos blocos de `/metrics` (spec 001): sem I/O, testável, sem NaN com
 * lista vazia ou total 0 (CA11).
 */
import { horaDoDia } from "@/lib/format";

export type LinhaTotal = { chave: string; total: number };

/** Soma por chave e devolve as `n` maiores (desempate alfabético, estável). */
export function topN(linhas: LinhaTotal[], n = 10): LinhaTotal[] {
  const mapa = new Map<string, number>();
  for (const l of linhas) mapa.set(l.chave, (mapa.get(l.chave) ?? 0) + l.total);
  return [...mapa.entries()]
    .map(([chave, total]) => ({ chave, total }))
    .sort((a, b) => b.total - a.total || a.chave.localeCompare(b.chave, "pt-BR"))
    .slice(0, n);
}

/** Percentual inteiro de `parte` em `total`; `total` 0 → 0 (nunca NaN/Infinity). */
export function percentual(parte: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Série diária contínua entre `diaInicio` e `diaFim` (datas puras, meia-noite UTC):
 * dias sem registro entram com 0. `dia` sai como "YYYY-MM-DD".
 */
export function montarSerieDiaria(
  linhas: { dia: Date; total: number }[],
  diaInicio: Date,
  diaFim: Date,
): { dia: string; total: number }[] {
  const porDia = new Map<string, number>();
  for (const l of linhas) {
    const k = l.dia.toISOString().slice(0, 10);
    porDia.set(k, (porDia.get(k) ?? 0) + l.total);
  }
  const serie: { dia: string; total: number }[] = [];
  for (let t = diaInicio.getTime(); t <= diaFim.getTime(); t += DIA_MS) {
    const k = new Date(t).toISOString().slice(0, 10);
    serie.push({ dia: k, total: porDia.get(k) ?? 0 });
  }
  return serie;
}

/**
 * 24 posições (0–23, horário de Brasília) a partir de contagens por hora cheia em UTC
 * (`date_trunc('hour')`). Convertido com `horaDoDia`, nunca com offset manual.
 */
export function montarHoras(linhas: { hora: Date; total: number }[]): number[] {
  const horas = Array.from({ length: 24 }, () => 0);
  for (const l of linhas) horas[horaDoDia(l.hora)] += l.total;
  return horas;
}

/** Hora de maior movimento; sem nenhum acesso → `null`. */
export function horaDePico(horas: number[]): number | null {
  let melhor = -1;
  let max = 0;
  horas.forEach((total, h) => {
    if (total > max) {
      max = total;
      melhor = h;
    }
  });
  return melhor === -1 ? null : melhor;
}

export type LinhaPlano = {
  planoNome: string;
  atribuicoes: number;
  ativas: number;
  atendimentos: number;
};

/** Junta as três contagens por `planoNome`; ordena por atendimentos, depois atribuições. */
export function mesclarPlanos(
  atribuicoes: Map<string, number>,
  ativas: Map<string, number>,
  atendimentos: Map<string, number>,
): LinhaPlano[] {
  const nomes = new Set([...atribuicoes.keys(), ...ativas.keys(), ...atendimentos.keys()]);
  return [...nomes]
    .map((planoNome) => ({
      planoNome,
      atribuicoes: atribuicoes.get(planoNome) ?? 0,
      ativas: ativas.get(planoNome) ?? 0,
      atendimentos: atendimentos.get(planoNome) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.atendimentos - a.atendimentos ||
        b.atribuicoes - a.atribuicoes ||
        a.planoNome.localeCompare(b.planoNome, "pt-BR"),
    );
}
