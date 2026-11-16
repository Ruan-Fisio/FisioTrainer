import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Guarda de autorização das server actions.
 *
 * Server action é um endpoint HTTP público: o Next aceita a chamada (POST com o
 * header `Next-Action`) em QUALQUER rota — inclusive /login, /pre-cadastro e
 * /compartilhado, que o proxy libera sem sessão. Por isso o proxy não protege
 * actions: toda action exportada de `src/actions/` começa com `exigirSessao()`
 * (ou `exigirSessaoOuPortal()`), exceto as públicas por desenho (login, portal por
 * token, pré-cadastro), que validam token/limites por conta própria.
 */

export class NaoAutenticadoError extends Error {
  constructor() {
    super("Não autenticado.");
    this.name = "NaoAutenticadoError";
  }
}

/**
 * Usuário logado, conferido no banco (uma vez por request). O JWT continua válido
 * até expirar mesmo depois de o usuário ser excluído — a consulta fecha essa brecha.
 */
const usuarioDaSessao = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
});

/** Exige usuário da clínica logado; lança `NaoAutenticadoError` caso contrário. */
export async function exigirSessao() {
  const usuario = await usuarioDaSessao();
  if (!usuario) throw new NaoAutenticadoError();
  return usuario;
}

/**
 * Contexto do portal público do paciente. Só código de servidor consegue abrir esse
 * contexto (via `comAcessoPortal`, depois de validar o token) — nada que venha do
 * navegador, nem argumento de action, chega aqui.
 */
const contextoPortal = new AsyncLocalStorage<{ pacienteId: string }>();

/** Roda `fn` com acesso de portal ao paciente `pacienteId` (já validado pelo token). */
export function comAcessoPortal<T>(pacienteId: string, fn: () => Promise<T>) {
  return contextoPortal.run({ pacienteId }, fn);
}

/** Paciente do portal em contexto, ou null fora do portal. */
export function pacienteDoPortal() {
  return contextoPortal.getStore()?.pacienteId ?? null;
}

/**
 * Para actions que o portal também usa: libera se estiver no contexto do portal do
 * MESMO paciente (`pacienteId` informado) — ou de qualquer paciente, quando o chamador
 * do portal já conferiu a posse do recurso (`pacienteId` omitido). Fora disso, exige
 * sessão da clínica.
 */
export async function exigirSessaoOuPortal(pacienteId?: string) {
  const doPortal = pacienteDoPortal();
  if (doPortal && (pacienteId === undefined || pacienteId === doPortal)) return;
  await exigirSessao();
}
