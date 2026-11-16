import { prisma } from "@/lib/prisma";
import {
  decidirAposContar,
  normalizarEstado,
  tempoRestanteBloqueio,
  type PoliticaLimite,
} from "@/lib/limite-tentativas";

/**
 * Persistência do controle de força bruta (tabela `LimiteTentativa`). Fica no Postgres
 * — e não em memória — porque em serverless cada request pode cair numa instância
 * diferente. As regras moram em `limite-tentativas.ts` (puro e testado).
 *
 * `LIMITE_TENTATIVAS=off` desliga tudo (só para depuração local). Erro de banco aqui
 * nunca derruba o fluxo: registra no log e libera — sem banco o login falha de todo jeito.
 */

export type ResultadoLimite = { permitido: boolean; restanteMs: number };

const LIBERADO: ResultadoLimite = { permitido: true, restanteMs: 0 };

function desligado() {
  return process.env.LIMITE_TENTATIVAS === "off";
}

/** Só consulta: a chave está bloqueada agora? Não conta tentativa. */
export async function verificarBloqueio(chave: string): Promise<ResultadoLimite> {
  if (desligado()) return LIBERADO;
  try {
    const atual = await prisma.limiteTentativa.findUnique({ where: { chave } });
    const restanteMs = tempoRestanteBloqueio(atual, new Date());
    return { permitido: restanteMs === 0, restanteMs };
  } catch (e) {
    console.error("Falha ao consultar limite de tentativas", e);
    return LIBERADO;
  }
}

/**
 * Conta uma tentativa (incremento atômico no banco) e diz se ela pode prosseguir.
 * Usado ANTES da operação sensível quando toda tentativa conta (login por e-mail,
 * formulário público), ou DEPOIS de uma falha quando só falhas contam (IP).
 */
export async function contarTentativa(
  chave: string,
  politica: PoliticaLimite,
): Promise<ResultadoLimite> {
  if (desligado()) return LIBERADO;
  try {
    const agora = new Date();
    await prisma.limiteTentativa.createMany({
      data: [{ chave, tentativas: 0, janelaInicio: agora }],
      skipDuplicates: true,
    });
    const atual = await prisma.limiteTentativa.findUniqueOrThrow({ where: { chave } });

    const restante = tempoRestanteBloqueio(atual, agora);
    if (restante > 0) return { permitido: false, restanteMs: restante };

    const base = normalizarEstado(atual, politica, agora);
    if (base.janelaInicio.getTime() !== atual.janelaInicio.getTime() || atual.bloqueadoAte) {
      // Recomeça a janela. O filtro pela janela lida evita que dois requests simultâneos
      // zerem o contador duas vezes (o segundo não casa e só incrementa).
      await prisma.limiteTentativa.updateMany({
        where: { chave, janelaInicio: atual.janelaInicio },
        data: {
          tentativas: base.tentativas,
          janelaInicio: base.janelaInicio,
          bloqueadoAte: null,
          bloqueios: base.bloqueios,
        },
      });
    }

    const contado = await prisma.limiteTentativa.update({
      where: { chave },
      data: { tentativas: { increment: 1 } },
    });
    const decisao = decidirAposContar(contado, politica, agora);
    if (decisao.novoEstado) {
      await prisma.limiteTentativa.update({ where: { chave }, data: decisao.novoEstado });
    }

    if (Math.random() < 0.01) void limparAntigos();
    return { permitido: decisao.permitido, restanteMs: decisao.restanteMs };
  } catch (e) {
    console.error("Falha ao registrar tentativa", e);
    return LIBERADO;
  }
}

/** Sucesso: esquece o contador da chave (ex. login correto). */
export async function zerarTentativas(chave: string) {
  if (desligado()) return;
  await prisma.limiteTentativa.deleteMany({ where: { chave } }).catch((e) => {
    console.error("Falha ao zerar tentativas", e);
  });
}

/** Faxina ocasional: chaves paradas há 2 dias e sem bloqueio vigente. */
async function limparAntigos() {
  const corte = new Date(Date.now() - 2 * 24 * 60 * 60_000);
  await prisma.limiteTentativa
    .deleteMany({
      where: {
        atualizadoEm: { lt: corte },
        OR: [{ bloqueadoAte: null }, { bloqueadoAte: { lt: new Date() } }],
      },
    })
    .catch(() => {});
}
