"use server";

import { randomUUID } from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { blocosContrato } from "@/lib/contrato-modelo";
import {
  cpfBloqueado,
  decodificarAssinaturaPng,
  estadoAposFalhaCpf,
  formatarNumeroContrato,
  hashSha256,
  ipDoAssinante,
} from "@/lib/contrato-regras";
import {
  removerPdfContrato,
  salvarPdfContrato,
  urlDownloadContrato,
} from "@/lib/contrato-storage";
import { buscarContratoComDados, renderizarContratoPendente } from "@/lib/contratos";
import { cpfConfere, mascararCpf } from "@/lib/cpf";
import { formatarDataHoraSegundos } from "@/lib/format";
import { ContratoPdfDocument } from "@/lib/pdf/contrato-documento";
import { prisma } from "@/lib/prisma";
import { chaveContratoPdf } from "@/lib/storage-keys";

/**
 * Actions públicas da página de assinatura: o token localiza o contrato, e o CPF é
 * conferido em toda chamada, pois nada do conteúdo sai antes disso.
 */

export type ContratoLiberado =
  | { status: "PENDENTE"; conteudo: string; conteudoHash: string }
  | { status: "ASSINADO"; conteudo: string; assinadoEm: string; pdfUrl: string };

type Resultado<T> = { ok: true; dados: T } | { ok: false; error: string };

function nomePdf(numero: number) {
  return `Contrato_${formatarNumeroContrato(numero)}.pdf`;
}

async function conferirCpf(token: string, cpf: string) {
  const contrato = await buscarContratoComDados({ token });
  if (!contrato || contrato.paciente.excluidoEm) {
    return { ok: false as const, error: "Link inválido." };
  }

  if (cpfBloqueado(contrato.bloqueadoAte)) {
    return {
      ok: false as const,
      error: "Muitas tentativas incorretas. Aguarde alguns minutos e tente de novo.",
    };
  }

  if (!cpfConfere(cpf, contrato.paciente.cpf)) {
    await prisma.contrato.update({
      where: { id: contrato.id },
      data: estadoAposFalhaCpf(contrato.tentativasCpf),
    });
    return { ok: false as const, error: "CPF não confere com o cadastro da clínica." };
  }

  if (contrato.tentativasCpf > 0) {
    await prisma.contrato.update({
      where: { id: contrato.id },
      data: { tentativasCpf: 0 },
    });
  }
  return { ok: true as const, contrato };
}

export async function liberarContrato(
  token: string,
  cpf: string,
): Promise<Resultado<ContratoLiberado>> {
  const conferido = await conferirCpf(token, cpf);
  if (!conferido.ok) return conferido;
  const { contrato } = conferido;

  if (contrato.status === "ASSINADO" && contrato.conteudo && contrato.pdfChave) {
    return {
      ok: true,
      dados: {
        status: "ASSINADO",
        conteudo: contrato.conteudo,
        assinadoEm: formatarDataHoraSegundos(contrato.assinadoEm!),
        pdfUrl: await urlDownloadContrato(contrato.pdfChave, nomePdf(contrato.numero)),
      },
    };
  }
  if (contrato.status !== "PENDENTE") {
    return { ok: false, error: "Este contrato não está mais disponível. Fale com a clínica." };
  }

  const atual = await renderizarContratoPendente(contrato);
  if (atual.pendencias.bloqueios.length > 0) {
    return {
      ok: false,
      error: "Este contrato ainda não está pronto para assinatura. Fale com a clínica.",
    };
  }
  return {
    ok: true,
    dados: {
      status: "PENDENTE",
      conteudo: atual.conteudo,
      conteudoHash: atual.conteudoHash,
    },
  };
}

export async function assinarContrato(
  token: string,
  entrada: { cpf: string; conteudoHash: string; assinatura: string; aceite: boolean },
): Promise<Resultado<{ assinadoEm: string; pdfUrl: string }>> {
  if (entrada.aceite !== true) {
    return { ok: false, error: "É preciso concordar com os termos para assinar." };
  }
  const assinatura = decodificarAssinaturaPng(entrada.assinatura);
  if (!assinatura) return { ok: false, error: "Assinatura inválida. Desenhe de novo." };

  const conferido = await conferirCpf(token, entrada.cpf);
  if (!conferido.ok) return conferido;
  const { contrato } = conferido;

  if (contrato.status !== "PENDENTE") {
    return { ok: false, error: "Este contrato não está mais disponível para assinatura." };
  }

  const atual = await renderizarContratoPendente(contrato);
  if (atual.pendencias.bloqueios.length > 0) {
    return {
      ok: false,
      error: "Este contrato ainda não está pronto para assinatura. Fale com a clínica.",
    };
  }
  // O paciente assina exatamente o que leu: se o texto mudou enquanto a página estava
  // aberta (modelo, plano ou cadastro), ele precisa rever antes.
  if (atual.conteudoHash !== entrada.conteudoHash) {
    return {
      ok: false,
      error: "O contrato foi atualizado pela clínica. Recarregue a página e leia a nova versão.",
    };
  }

  const cabecalhos = await headers();
  const assinadoEm = new Date();
  const ip = ipDoAssinante(
    cabecalhos.get("x-forwarded-for"),
    cabecalhos.get("x-real-ip"),
  );
  const userAgent = (cabecalhos.get("user-agent") ?? "não identificado").slice(0, 500);
  const assinanteCpf = mascararCpf(contrato.paciente.cpf);
  const assinadoEmTexto = formatarDataHoraSegundos(assinadoEm);
  const chave = chaveContratoPdf(contrato.pacienteId, contrato.id, randomUUID());

  let pdf: Uint8Array;
  try {
    pdf = new Uint8Array(
      await renderToBuffer(
        ContratoPdfDocument({
          numero: formatarNumeroContrato(contrato.numero),
          blocos: blocosContrato(atual.conteudo),
          assinatura,
          assinanteNome: contrato.paciente.nome,
          assinanteCpf,
          assinadoEm: assinadoEmTexto,
          ip,
          userAgent,
          conteudoHash: atual.conteudoHash,
        }),
      ),
    );
    await salvarPdfContrato(chave, pdf);
  } catch (e) {
    console.error("Falha ao gerar ou salvar o PDF do contrato", e);
    return { ok: false, error: "Não foi possível concluir a assinatura. Tente novamente." };
  }

  // `status: PENDENTE` no filtro: de dois envios simultâneos, só um registra a assinatura.
  const { count } = await prisma.contrato.updateMany({
    where: { id: contrato.id, status: "PENDENTE" },
    data: {
      status: "ASSINADO",
      conteudo: atual.conteudo,
      conteudoHash: atual.conteudoHash,
      modeloVersao: atual.modeloVersao,
      dadosPlanoHash: atual.dadosPlanoHash,
      assinadoEm,
      assinanteNome: contrato.paciente.nome,
      assinanteCpf,
      assinanteIp: ip,
      assinanteUserAgent: userAgent,
      pdfChave: chave,
      pdfHash: hashSha256(pdf),
    },
  });
  if (count === 0) {
    await removerPdfContrato(chave).catch((e) =>
      console.error("Falha ao remover PDF de envio duplicado", e),
    );
    return { ok: false, error: "Este contrato já foi assinado. Recarregue a página." };
  }

  revalidatePath(`/pacientes/${contrato.pacienteId}`);
  revalidatePath("/contratos");

  return {
    ok: true,
    dados: {
      assinadoEm: assinadoEmTexto,
      pdfUrl: await urlDownloadContrato(chave, nomePdf(contrato.numero)),
    },
  };
}
