import { notFound } from "next/navigation";
import { AssinarContratoFluxo } from "@/components/contratos/assinar-contrato-fluxo";
import { Card, CardContent } from "@/components/ui/card";
import { formatarNumeroContrato } from "@/lib/contrato-regras";
import { prisma } from "@/lib/prisma";

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-8 text-center">
        <h1 className="text-lg font-semibold">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </CardContent>
    </Card>
  );
}

/** Página pública: antes de confirmar o CPF, só mostra o primeiro nome e o nome do plano. */
export default async function AssinarContratoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contrato = await prisma.contrato.findUnique({
    where: { token },
    select: {
      numero: true,
      status: true,
      paciente: { select: { nome: true, cpf: true, excluidoEm: true } },
      planoAtribuicao: { select: { planoNome: true } },
    },
  });
  if (!contrato) notFound();

  if (
    contrato.paciente.excluidoEm ||
    contrato.status === "CANCELADO" ||
    contrato.status === "SUBSTITUIDO"
  ) {
    return (
      <Aviso
        titulo="Contrato indisponível"
        texto="Este contrato foi cancelado ou substituído. Fale com a clínica para receber o link atual."
      />
    );
  }

  if (!contrato.paciente.cpf?.trim()) {
    return (
      <Aviso
        titulo="Falta um dado para assinar"
        texto="Seu CPF ainda não está no cadastro. Informe à clínica e abra este link de novo."
      />
    );
  }

  return (
    <AssinarContratoFluxo
      token={token}
      primeiroNome={contrato.paciente.nome.split(/\s+/)[0]}
      planoNome={contrato.planoAtribuicao.planoNome}
      numero={formatarNumeroContrato(contrato.numero)}
    />
  );
}
