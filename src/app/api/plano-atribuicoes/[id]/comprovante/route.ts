import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import {
  ComprovantePdfDocument,
  type LinhaInfo,
} from "@/lib/pdf/comprovante-documento";
import {
  formaPagamentoPlanoLabels,
  periodicidadePlanoLabels,
} from "@/lib/validations/plano";

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const atribuicao = await prisma.planoAtribuicao.findUnique({
    where: { id },
    include: {
      paciente: true,
      cobrancas: { orderBy: { vencimento: "asc" } },
    },
  });

  if (!atribuicao) {
    return NextResponse.json({ error: "Atribuição não encontrada." }, { status: 404 });
  }

  const profissional = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: {
      name: true,
      razaoSocial: true,
      cpfCnpj: true,
      inscricaoMunicipal: true,
      telefone: true,
      endereco: true,
      email: true,
    },
  });

  const prestador: LinhaInfo[] = [
    { label: "Nome / Razão social", valor: profissional?.razaoSocial || profissional?.name || "—" },
    { label: "CPF/CNPJ", valor: profissional?.cpfCnpj || "Não informado" },
    ...(profissional?.inscricaoMunicipal
      ? [{ label: "Inscrição municipal", valor: profissional.inscricaoMunicipal }]
      : []),
    { label: "Endereço", valor: profissional?.endereco || "Não informado" },
    { label: "Telefone", valor: profissional?.telefone || "Não informado" },
    { label: "E-mail", valor: profissional?.email || "Não informado" },
  ];

  const paciente = atribuicao.paciente;
  const tomador: LinhaInfo[] = [
    { label: "Nome", valor: paciente.nome },
    { label: "CPF", valor: paciente.cpf || "Não informado" },
    { label: "Endereço", valor: paciente.endereco || "Não informado" },
    { label: "Telefone/Contato", valor: paciente.contato || "Não informado" },
    { label: "E-mail", valor: paciente.email || "Não informado" },
  ];

  const servico: LinhaInfo[] = [
    { label: "Serviço", valor: atribuicao.planoNome },
    ...(atribuicao.atendimentos
      ? [{ label: "Atendimentos", valor: `${atribuicao.atendimentos}x` }]
      : []),
    { label: "Início", valor: formatarData(atribuicao.dataInicio) },
    { label: "Parcelamento", valor: `${atribuicao.numeroParcelas}x` },
    { label: "Forma de pagamento", valor: formaPagamentoPlanoLabels[atribuicao.formaPagamento] },
    { label: "Periodicidade", valor: periodicidadePlanoLabels[atribuicao.periodicidade] },
  ];

  const valorOriginal = Number(atribuicao.valorOriginal);
  const desconto = Number(atribuicao.desconto);
  const valorFinal = Number(atribuicao.valor);
  const percentualDesconto = valorOriginal > 0 ? (desconto / valorOriginal) * 100 : 0;

  const valores: LinhaInfo[] = [
    { label: "Valor original", valor: formatarMoeda(valorOriginal) },
    {
      label: "Desconto aplicado",
      valor:
        desconto > 0
          ? `${formatarMoeda(desconto)} (${percentualDesconto.toFixed(1)}%)`
          : formatarMoeda(0),
    },
    { label: "Valor total (líquido)", valor: formatarMoeda(valorFinal) },
  ];

  const parcelas = atribuicao.cobrancas.map((cobranca) => ({
    numero: cobranca.numeroParcela ?? 1,
    vencimento: formatarData(cobranca.vencimento),
    valor: formatarMoeda(Number(cobranca.valor)),
    status: STATUS_LABEL[cobranca.status] ?? cobranca.status,
  }));

  const buffer = await renderToBuffer(
    ComprovantePdfDocument({
      numero: `${paciente.nome} — ${atribuicao.planoNome}`,
      geradoEm: formatarDataHora(new Date()),
      prestador,
      tomador,
      servico,
      valores,
      parcelas,
    }),
  );

  const nomeArquivo = `Comprovante_${paciente.nome.replace(/\s+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
