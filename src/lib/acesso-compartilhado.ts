import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { POLITICAS, ipDoCliente } from "@/lib/limite-tentativas";
import { contarTentativa, verificarBloqueio } from "@/lib/limite-tentativas-db";

/**
 * Token novo de link público: 256 bits aleatórios (o `@default(cuid())` do schema não
 * é criptograficamente seguro — tem timestamp e contador previsíveis). Links antigos
 * continuam valendo.
 */
export function gerarTokenPublico() {
  return randomBytes(32).toString("base64url");
}

/** Tamanho máximo plausível de token (cuid antigo ou base64url de 32 bytes). */
const TOKEN_MAX = 64;

async function chaveIpToken() {
  return `token-publico-ip:${ipDoCliente(await headers())}`;
}

/**
 * Varredura de tokens: cada token inválido conta contra o IP; passou do limite,
 * o IP fica bloqueado (até os tokens válidos deixam de abrir nesse intervalo).
 */
export async function ipBloqueadoParaTokens() {
  return !(await verificarBloqueio(await chaveIpToken())).permitido;
}

export async function registrarTokenInvalido() {
  await contarTentativa(await chaveIpToken(), POLITICAS.tokenPublicoIp);
}

async function buscarAcesso(token: string) {
  if (await ipBloqueadoParaTokens()) return null;
  const acesso =
    typeof token === "string" && token.length > 0 && token.length <= TOKEN_MAX
      ? await prisma.acessoCompartilhadoPaciente.findUnique({
          where: { token },
          include: { paciente: true },
        })
      : null;

  const valido =
    acesso &&
    acesso.ativo &&
    !acesso.paciente.excluidoEm &&
    !(acesso.expiraEm && acesso.expiraEm.getTime() < Date.now());
  if (!valido) {
    await registrarTokenInvalido();
    return null;
  }
  return acesso;
}

/**
 * Versão sem `notFound()` para server actions do portal: devolve o id do
 * paciente dono do link, ou null se o token não existe/foi revogado/expirou.
 * Toda escrita pública deve derivar o paciente DAQUI, nunca de um id do client.
 */
export async function buscarPacienteIdPorToken(token: string) {
  return (await buscarAcesso(token))?.pacienteId ?? null;
}

/**
 * Valida o token do link público de um paciente (rota /compartilhado/paciente/[token]).
 * Faz `notFound()` se o token não existe, foi revogado (`ativo: false`) ou expirou.
 *
 * Obs.: não gravamos `ultimoAcessoEm` aqui de propósito — toda escrita passa pela
 * trilha de auditoria (`src/lib/prisma.ts`) e um update a cada page view poluiria a
 * tela /logs.
 */
export async function resolverPacientePorToken(token: string) {
  const acesso = await buscarAcesso(token);
  if (!acesso) notFound();
  return { pacienteId: acesso.pacienteId, paciente: acesso.paciente };
}
