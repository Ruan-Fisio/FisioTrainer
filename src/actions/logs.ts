"use server";

import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 30;

export type LogFilters = {
  q?: string;
  modulos?: string[];
  acoes?: string[];
  de?: string;
  ate?: string;
};

export async function listLogs(filters: LogFilters, page: number) {
  const criadoEm: { gte?: Date; lte?: Date } = {};
  if (filters.de) criadoEm.gte = new Date(`${filters.de}T00:00:00`);
  if (filters.ate) criadoEm.lte = new Date(`${filters.ate}T23:59:59`);

  const where = {
    ...(filters.q
      ? {
          OR: [
            { resumo: { contains: filters.q, mode: "insensitive" as const } },
            { usuarioNome: { contains: filters.q, mode: "insensitive" as const } },
            { registroId: filters.q },
          ],
        }
      : {}),
    ...(filters.modulos && filters.modulos.length > 0
      ? { modulo: { in: filters.modulos } }
      : {}),
    ...(filters.acoes && filters.acoes.length > 0 ? { acao: { in: filters.acoes } } : {}),
    ...(criadoEm.gte || criadoEm.lte ? { criadoEm } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
  };
}
