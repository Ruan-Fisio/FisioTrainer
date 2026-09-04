import { cache } from "react";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import {
  AUDIT_WRITE_OPS,
  acaoLabel,
  moduloLabel,
  rotuloDoRegistro,
  sanitizarValorAuditoria,
} from "@/lib/audit";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof criarPrisma> | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const WRITE_OPS = new Set<string>(AUDIT_WRITE_OPS);

/**
 * Usuário logado para atribuir a operação na trilha de auditoria. Import dinâmico de
 * `@/lib/auth` pra evitar ciclo de import (auth.ts importa este arquivo). `cache()`
 * deduplica por request — não decodifica o JWT a cada query.
 */
const usuarioAtual = cache(async () => {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    return session?.user ?? null;
  } catch {
    return null;
  }
});

function idDe(v: unknown): string | null {
  return v && typeof v === "object" && "id" in v && typeof (v as { id: unknown }).id === "string"
    ? (v as { id: string }).id
    : null;
}

function extrairRegistroId(
  operation: string,
  args: unknown,
  result: unknown,
  antes: unknown,
): string | null {
  const where = (args as { where?: unknown } | undefined)?.where;
  if (operation === "delete") return idDe(where) ?? idDe(antes);
  return idDe(result) ?? idDe(where);
}

function construirDados(operation: string, args: unknown, antes: unknown) {
  const a = (args ?? {}) as Record<string, unknown>;
  switch (operation) {
    case "create":
    case "createMany":
    case "createManyAndReturn":
      return { data: sanitizarValorAuditoria(a.data) };
    case "update":
    case "updateMany":
      return { where: sanitizarValorAuditoria(a.where), data: sanitizarValorAuditoria(a.data) };
    case "upsert":
      return {
        where: sanitizarValorAuditoria(a.where),
        create: sanitizarValorAuditoria(a.create),
        update: sanitizarValorAuditoria(a.update),
      };
    case "delete":
      return { where: sanitizarValorAuditoria(a.where), registro: sanitizarValorAuditoria(antes) };
    case "deleteMany":
      return { where: sanitizarValorAuditoria(a.where) };
    default:
      return { args: sanitizarValorAuditoria(args) };
  }
}

function montarResumo(modulo: string, operation: string, args: unknown, antes: unknown) {
  const a = (args ?? {}) as Record<string, unknown>;
  const rotulo =
    rotuloDoRegistro(a.data) ??
    rotuloDoRegistro(a.create) ??
    rotuloDoRegistro(antes) ??
    rotuloDoRegistro(a.where);
  const base = `${moduloLabel(modulo)} · ${acaoLabel(operation)}`;
  return rotulo ? `${base} — ${rotulo}` : base;
}

function criarPrisma() {
  const base = new PrismaClient({ adapter });
  const auditoriaAtiva = process.env.AUDIT_LOG !== "off";

  async function registrar(params: {
    model: string;
    operation: string;
    args: unknown;
    result: unknown;
    antes: unknown;
  }) {
    try {
      const usuario = await usuarioAtual();
      await base.auditLog.create({
        data: {
          usuarioId: usuario?.id ?? null,
          usuarioNome: usuario?.name ?? null,
          modulo: params.model,
          acao: params.operation,
          registroId: extrairRegistroId(params.operation, params.args, params.result, params.antes),
          resumo: montarResumo(params.model, params.operation, params.args, params.antes),
          dados: construirDados(params.operation, params.args, params.antes) as object,
        },
      });
    } catch {
      // a trilha de auditoria nunca pode quebrar a operação real
    }
  }

  return base.$extends({
    name: "audit-log",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            !auditoriaAtiva ||
            !model ||
            model === "AuditLog" ||
            !WRITE_OPS.has(operation)
          ) {
            return query(args);
          }

          // Estado anterior de deletes de registro único (a linha some depois).
          let antes: unknown;
          if (operation === "delete") {
            const where = (args as { where?: unknown } | undefined)?.where;
            if (where) {
              const delegate = base[
                (model[0].toLowerCase() + model.slice(1)) as keyof typeof base
              ] as unknown as { findUnique: (a: unknown) => Promise<unknown> };
              antes = await delegate.findUnique({ where }).catch(() => null);
            }
          }

          const result = await query(args);
          void registrar({ model, operation, args, result, antes });
          return result;
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? criarPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
