"use server";

import { prisma } from "@/lib/prisma";
import {
  fimDaSemana,
  fimDoDia,
  fimDoMes,
  inicioDoDia,
} from "@/lib/datas-brasilia";
import {
  analisarFinanceiro,
  sequenciaMeses,
  type CobrancaLinha,
} from "@/lib/financeiro";

export type PeriodoProximos = "dia" | "semana" | "mes";

/** Contagem de compromissos ainda por acontecer em cada janela, para o resumo do dashboard. */
export async function getContagensAgenda() {
  const inicio = inicioDoDia();
  const base = { status: "AGENDADO" as const };

  const [dia, semana, mes] = await Promise.all([
    prisma.agendamento.count({
      where: { ...base, dataInicio: { gte: inicio, lte: fimDoDia() } },
    }),
    prisma.agendamento.count({
      where: { ...base, dataInicio: { gte: inicio, lte: fimDaSemana() } },
    }),
    prisma.agendamento.count({
      where: { ...base, dataInicio: { gte: inicio, lte: fimDoMes() } },
    }),
  ]);

  return { dia, semana, mes };
}

export async function getDashboardStats() {
  const [pacientes, avaliacoes, evolucoes] = await Promise.all([
    prisma.paciente.count(),
    prisma.exameExecucao.count({ where: { tipo: "AVALIACAO" } }),
    prisma.evolucao.count(),
  ]);

  return { pacientes, avaliacoes, evolucoes };
}

/** Agendamentos futuros (retornos/reavaliações) ainda não realizados, dentro do período escolhido. */
export async function getProximosAgendamentos(periodo: PeriodoProximos = "dia") {
  const inicio = inicioDoDia();
  const fim =
    periodo === "dia" ? fimDoDia() : periodo === "semana" ? fimDaSemana() : fimDoMes();

  return prisma.agendamento.findMany({
    where: { dataInicio: { gte: inicio, lte: fim }, status: { not: "CANCELADO" } },
    orderBy: { dataInicio: "asc" },
    take: 200,
    include: {
      pacientes: { select: { id: true, nome: true } },
      profissional: { select: { id: true, name: true } },
      sala: { select: { id: true, nome: true } },
      servico: { select: { id: true, nome: true } },
    },
  });
}

export type CobrancaAtrasada = {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  planoNome: string;
  vencimento: Date;
  valor: number;
};

/**
 * Análise financeira detalhada da aba Financeiro do dashboard: receita realizada por
 * mês, split por modalidade (Fisioterapia x Educação Física x Combinado x Avulso),
 * a receber nos próximos meses e rankings. A agregação por mês (fuso de Brasília) fica
 * em `@/lib/financeiro` (puro, testado); aqui só a leitura do banco.
 */
export async function getAnaliseFinanceira() {
  const agora = new Date();
  const hoje = inicioDoDia(agora);
  const inicioJanela = new Date(
    `${sequenciaMeses(agora, 12, "passado")[0]}-01T00:00:00.000-03:00`,
  );

  const cobrancas = await prisma.cobranca.findMany({
    where: {
      OR: [
        { status: "PAGO", pagoEm: { gte: inicioJanela } },
        { status: "PENDENTE" },
      ],
    },
    select: {
      id: true,
      valor: true,
      status: true,
      pagoEm: true,
      vencimento: true,
      planoNome: true,
      pacienteId: true,
      paciente: { select: { nome: true } },
      planoAtribuicao: { select: { plano: { select: { tipos: true } } } },
      servicoId: true,
      taxaProfissional: true,
    },
  });

  const linhas: CobrancaLinha[] = cobrancas.map((c) => ({
    valor: Number(c.valor),
    status: c.status,
    pagoEm: c.pagoEm,
    vencimento: c.vencimento,
    planoNome: c.planoNome,
    pacienteId: c.pacienteId,
    pacienteNome: c.paciente.nome,
    tipos: c.planoAtribuicao?.plano?.tipos ?? null,
    servicoId: c.servicoId,
    taxaProfissional: c.taxaProfissional == null ? null : Number(c.taxaProfissional),
  }));

  const atrasadas: CobrancaAtrasada[] = cobrancas
    .filter((c) => c.status === "PENDENTE" && c.vencimento < hoje)
    .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
    .map((c) => ({
      id: c.id,
      pacienteId: c.pacienteId,
      pacienteNome: c.paciente.nome,
      planoNome: c.planoNome,
      vencimento: c.vencimento,
      valor: Number(c.valor),
    }));

  return { ...analisarFinanceiro(linhas, agora), atrasadas };
}
