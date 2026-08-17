import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EvolucaoPdfDocument } from "@/lib/pdf/evolucao-documento";

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ evolucaoId: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { evolucaoId } = await params;

  const evolucao = await prisma.evolucao.findUnique({
    where: { id: evolucaoId },
    include: {
      paciente: { select: { nome: true } },
      profissional: { select: { name: true, cref: true, crefito: true } },
    },
  });

  if (!evolucao) {
    return NextResponse.json({ error: "Evolução não encontrada." }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    EvolucaoPdfDocument({
      pacienteNome: evolucao.paciente.nome,
      dataFormatada: formatarData(evolucao.data),
      hdp: evolucao.hdp,
      hda: evolucao.hda,
      pa: evolucao.pa,
      fc: evolucao.fc,
      spo2: evolucao.spo2,
      fr: evolucao.fr,
      temperatura: evolucao.temperatura,
      auscultaPulmonar: evolucao.auscultaPulmonar,
      evolucao: evolucao.evolucao,
      conduta: evolucao.conduta,
      profissional: {
        nome: evolucao.profissional.name,
        cref: evolucao.profissional.cref,
        crefito: evolucao.profissional.crefito,
      },
      geradoEm: formatarData(new Date()),
    }),
  );

  const nomeArquivo = `Evolucao_${evolucao.paciente.nome.replace(/\s+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
