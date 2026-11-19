/**
 * Métricas de uso (`/metrics`, spec 001): registro, agregação, consultas e purga.
 * Escrita NUNCA quebra a operação real (CA9). `EventoUso`/`UsoDiario` ficam fora da
 * auditoria (`src/lib/prisma.ts`).
 */
import { prisma } from "@/lib/prisma";
import { diaDaMetrica, intervaloPeriodo, limitePurga } from "@/lib/metricas-periodo";
import type { AreaUsoChave } from "@/lib/metricas-rota";
import {
  mesclarPlanos,
  montarHoras,
  montarSerieDiaria,
  topN,
  type LinhaPlano,
} from "@/lib/metricas-montagem";
import { moduloLabel } from "@/lib/audit";

export type TipoUsoChave = "TELA" | "ACAO";

export type EventoMetrica = {
  area: AreaUsoChave;
  tipo: TipoUsoChave;
  chave: string;
  /** Só na área CLINICA (RN3). */
  usuarioId?: string | null;
};

/** Cliente mínimo usado por `registrarEvento` (permite mock nos testes). */
export type ClienteMetricas = {
  eventoUso: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

/**
 * Grava o evento bruto e incrementa o agregado do dia de forma atômica
 * (`INSERT ... ON CONFLICT DO UPDATE SET total = total + 1`, RN8). Engole qualquer erro.
 * Retorna `true` se gravou.
 */
export async function registrarEvento(
  evento: EventoMetrica,
  opcoes: { agora?: Date; cliente?: ClienteMetricas } = {},
): Promise<boolean> {
  try {
    const agora = opcoes.agora ?? new Date();
    const cliente = opcoes.cliente ?? (prisma as unknown as ClienteMetricas);
    const usuarioId = evento.area === "CLINICA" ? (evento.usuarioId ?? null) : null;
    const dia = diaDaMetrica(agora);

    await cliente.eventoUso.create({
      data: {
        criadoEm: agora,
        area: evento.area,
        tipo: evento.tipo,
        chave: evento.chave,
        usuarioId,
      },
    });
    await cliente.$executeRaw`
      INSERT INTO "UsoDiario" ("id", "dia", "area", "tipo", "chave", "total")
      VALUES (${crypto.randomUUID()}, ${dia}::date, ${evento.area}::"AreaUso", ${evento.tipo}::"TipoUso", ${evento.chave}, 1)
      ON CONFLICT ("dia", "area", "tipo", "chave")
      DO UPDATE SET "total" = "UsoDiario"."total" + 1`;
    return true;
  } catch {
    return false;
  }
}

/** Apaga eventos brutos com mais de 90 dias. Idempotente; `UsoDiario` permanece (CA8). */
export async function purgarAntigos(agora: Date = new Date()): Promise<number> {
  try {
    const { count } = await prisma.eventoUso.deleteMany({
      where: { criadoEm: { lt: limitePurga(agora) } },
    });
    return count;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Consultas dos blocos de /metrics. Séries e rankings usam `UsoDiario` (sobrevive à
// purga); usuários ativos e horário de pico usam `EventoUso` (só os últimos 90 dias).
// ---------------------------------------------------------------------------

/** Início efetivo para consultas em `EventoUso`: o período, limitado pela retenção. */
function inicioBrutos(dias: number, agora: Date) {
  const { inicio } = intervaloPeriodo(dias, agora);
  const limite = limitePurga(agora);
  return inicio > limite ? inicio : limite;
}

/** Telas mais acessadas (top 10) por área. */
export async function telasMaisAcessadas(
  area: AreaUsoChave,
  dias: number,
  agora: Date = new Date(),
) {
  const { diaInicio, diaFim } = intervaloPeriodo(dias, agora);
  const linhas = await prisma.usoDiario.groupBy({
    by: ["chave"],
    where: { area, tipo: "TELA", dia: { gte: diaInicio, lte: diaFim } },
    _sum: { total: true },
  });
  return topN(linhas.map((l) => ({ chave: l.chave, total: l._sum.total ?? 0 })), 10);
}

/** Page views por dia (todas as áreas), com dias sem acesso preenchidos com 0. */
export async function viewsPorDia(dias: number, agora: Date = new Date()) {
  const { diaInicio, diaFim } = intervaloPeriodo(dias, agora);
  const linhas = await prisma.usoDiario.groupBy({
    by: ["dia"],
    where: { tipo: "TELA", dia: { gte: diaInicio, lte: diaFim } },
    _sum: { total: true },
  });
  return montarSerieDiaria(
    linhas.map((l) => ({ dia: l.dia, total: l._sum.total ?? 0 })),
    diaInicio,
    diaFim,
  );
}

/** Usuários distintos com page view na clínica (só últimos 90 dias de brutos). */
export async function usuariosAtivos(dias: number, agora: Date = new Date()) {
  const grupos = await prisma.eventoUso.groupBy({
    by: ["usuarioId"],
    where: {
      area: "CLINICA",
      tipo: "TELA",
      usuarioId: { not: null },
      criadoEm: { gte: inicioBrutos(dias, agora), lte: agora },
    },
  });
  return grupos.length;
}

/** Page views por hora do dia (0–23, Brasília), só últimos 90 dias de brutos. */
export async function acessosPorHora(dias: number, agora: Date = new Date()) {
  const desde = inicioBrutos(dias, agora);
  const linhas = await prisma.$queryRaw<{ hora: Date; total: bigint }[]>`
    SELECT date_trunc('hour', "criadoEm") AS "hora", COUNT(*)::bigint AS "total"
    FROM "EventoUso"
    WHERE "tipo" = 'TELA'::"TipoUso" AND "criadoEm" >= ${desde} AND "criadoEm" <= ${agora}
    GROUP BY 1`;
  return montarHoras(linhas.map((l) => ({ hora: l.hora, total: Number(l.total) })));
}

export type AcoesChave = {
  logins: number;
  modulos: { modulo: string; rotulo: string; criacoes: number; alteracoes: number }[];
};

const ACOES_CRIACAO = ["create", "createMany", "createManyAndReturn"];
const ACOES_ALTERACAO = ["update", "updateMany", "upsert"];

/** Logins (de `UsoDiario`) + criações/alterações por módulo (do `AuditLog`). */
export async function acoesChave(dias: number, agora: Date = new Date()): Promise<AcoesChave> {
  const { inicio, diaInicio, diaFim } = intervaloPeriodo(dias, agora);
  const [logins, audit] = await Promise.all([
    prisma.usoDiario.aggregate({
      where: { area: "CLINICA", tipo: "ACAO", chave: "login", dia: { gte: diaInicio, lte: diaFim } },
      _sum: { total: true },
    }),
    prisma.auditLog.groupBy({
      by: ["modulo", "acao"],
      where: {
        acao: { in: [...ACOES_CRIACAO, ...ACOES_ALTERACAO] },
        criadoEm: { gte: inicio, lte: agora },
      },
      _count: { _all: true },
    }),
  ]);

  const porModulo = new Map<string, { criacoes: number; alteracoes: number }>();
  for (const g of audit) {
    const atual = porModulo.get(g.modulo) ?? { criacoes: 0, alteracoes: 0 };
    if (ACOES_CRIACAO.includes(g.acao)) atual.criacoes += g._count._all;
    else atual.alteracoes += g._count._all;
    porModulo.set(g.modulo, atual);
  }
  const modulos = [...porModulo.entries()]
    .map(([modulo, v]) => ({ modulo, rotulo: moduloLabel(modulo), ...v }))
    .sort((a, b) => b.criacoes + b.alteracoes - (a.criacoes + a.alteracoes))
    .slice(0, 10);

  return { logins: logins._sum.total ?? 0, modulos };
}

/**
 * Planos mais usados, por `planoNome` (snapshot — plano excluído continua aparecendo):
 * atribuições criadas no período, ativas hoje e atendimentos agendados no período
 * (exceto cancelados).
 */
export async function planosMaisUsados(dias: number, agora: Date = new Date()): Promise<LinhaPlano[]> {
  const { inicio } = intervaloPeriodo(dias, agora);
  const [criadas, ativas, agendados] = await Promise.all([
    prisma.planoAtribuicao.groupBy({
      by: ["planoNome"],
      where: { createdAt: { gte: inicio, lte: agora } },
      _count: { _all: true },
    }),
    prisma.planoAtribuicao.groupBy({
      by: ["planoNome"],
      where: { status: "ATIVO" },
      _count: { _all: true },
    }),
    prisma.agendamento.groupBy({
      by: ["planoAtribuicaoId"],
      where: {
        planoAtribuicaoId: { not: null },
        status: { not: "CANCELADO" },
        dataInicio: { gte: inicio, lte: agora },
      },
      _count: { _all: true },
    }),
  ]);

  const ids = agendados.map((a) => a.planoAtribuicaoId).filter((id): id is string => !!id);
  const atribuicoes = ids.length
    ? await prisma.planoAtribuicao.findMany({
        where: { id: { in: ids } },
        select: { id: true, planoNome: true },
      })
    : [];
  const nomePorId = new Map(atribuicoes.map((a) => [a.id, a.planoNome]));

  const atendimentos = new Map<string, number>();
  for (const a of agendados) {
    const nome = a.planoAtribuicaoId ? nomePorId.get(a.planoAtribuicaoId) : undefined;
    if (nome) atendimentos.set(nome, (atendimentos.get(nome) ?? 0) + a._count._all);
  }

  return mesclarPlanos(
    new Map(criadas.map((c) => [c.planoNome, c._count._all])),
    new Map(ativas.map((c) => [c.planoNome, c._count._all])),
    atendimentos,
  );
}
