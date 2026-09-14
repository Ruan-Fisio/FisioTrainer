import Link from "next/link";
import { notFound } from "next/navigation";
import { resolverPacientePorToken } from "@/lib/acesso-compartilhado";
import { listPlanoAtribuicoesByPaciente } from "@/actions/plano-atribuicoes";
import { getCobrancasByPaciente } from "@/actions/cobrancas";
import { PacienteCobrancasList } from "@/components/cobrancas/paciente-cobrancas-list";
import { Button } from "@/components/ui/button";

export default async function FinanceiroPlanoPublicoPage({
  params,
}: {
  params: Promise<{ token: string; planoId: string }>;
}) {
  const { token, planoId } = await params;
  const { pacienteId, paciente } = await resolverPacientePorToken(token);

  const [atribuicoes, cobrancas] = await Promise.all([
    listPlanoAtribuicoesByPaciente(pacienteId),
    getCobrancasByPaciente(pacienteId),
  ]);

  const isAvulsas = planoId === "avulsas";
  const atribuicao = isAvulsas
    ? null
    : atribuicoes.find((a) => a.id === planoId);

  if (!isAvulsas && !atribuicao) notFound();

  const cobrancasFiltradas = isAvulsas
    ? cobrancas.filter((c) => !c.planoAtribuicaoId)
    : cobrancas.filter((c) => c.planoAtribuicaoId === planoId);

  if (cobrancasFiltradas.length === 0) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          {isAvulsas ? "Cobranças avulsas" : atribuicao!.planoNome}
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/compartilhado/paciente/${token}?tab=financeiro`}>
            Voltar
          </Link>
        </Button>
      </div>

      <PacienteCobrancasList
        pacienteId={pacienteId}
        pacienteNome={paciente.nome}
        pacienteContato={null}
        cobrancas={cobrancasFiltradas}
        atribuicoes={isAvulsas ? [] : [atribuicao!]}
        cnpjPix={null}
        somenteLeitura
      />
    </div>
  );
}
