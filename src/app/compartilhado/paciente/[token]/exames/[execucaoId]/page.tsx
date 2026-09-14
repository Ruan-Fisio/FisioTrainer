import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getExecucao } from "@/actions/exame-execucoes";
import { resolverPacientePorToken } from "@/lib/acesso-compartilhado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExecucaoValores } from "@/components/exame-execucoes/execucao-detalhe";
import { formatarDataHora } from "@/lib/format";

export default async function ExecucaoPublicaPage({
  params,
}: {
  params: Promise<{ token: string; execucaoId: string }>;
}) {
  const { token, execucaoId } = await params;
  const { pacienteId } = await resolverPacientePorToken(token);

  const execucao = await getExecucao(execucaoId);

  if (!execucao || execucao.pacienteId !== pacienteId) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{execucao.exame.nome}</h1>
            <Badge variant="secondary">
              {execucao.tipo === "AVALIACAO" ? "Avaliação" : "Retorno"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatarDataHora(execucao.data)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/compartilhado/paciente/${token}?tab=avaliacoes`}>
            Voltar
          </Link>
        </Button>
      </div>

      <ExecucaoValores execucao={execucao} />

      {execucao.tipo === "AVALIACAO" && execucao.retornos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Retornos</h2>
          {execucao.retornos.map((retorno) => (
            <Card key={retorno.id} className="p-0">
              <Link
                href={`/compartilhado/paciente/${token}/exames/${retorno.id}`}
                className="group flex items-center justify-between gap-2 p-4 transition-colors hover:bg-primary/5"
              >
                <p className="text-sm">{formatarDataHora(retorno.data)}</p>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Card>
          ))}
        </div>
      )}

      {execucao.tipo === "RETORNO" && execucao.avaliacao && (
        <p className="text-sm text-muted-foreground">
          Retorno da avaliação de {formatarDataHora(execucao.avaliacao.data)}
          {" — "}
          <Link
            href={`/compartilhado/paciente/${token}/exames/${execucao.avaliacao.id}`}
            className="underline"
          >
            ver avaliação original
          </Link>
        </p>
      )}
    </div>
  );
}
