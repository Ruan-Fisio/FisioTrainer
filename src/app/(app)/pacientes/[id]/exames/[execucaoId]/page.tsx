import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Plus, GitCompare } from "lucide-react";
import { getExecucao } from "@/actions/exame-execucoes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExecucaoDetailActions } from "@/components/exame-execucoes/execucao-detail-actions";
import { ExecucaoValores } from "@/components/exame-execucoes/execucao-detalhe";
import { ComparacaoRapidaDialog } from "@/components/exame-execucoes/comparacao-rapida-dialog";
import { formatarDataHora } from "@/lib/format";

export default async function ExecucaoDetailPage({
  params,
}: {
  params: Promise<{ id: string; execucaoId: string }>;
}) {
  const { id, execucaoId } = await params;

  const execucao = await getExecucao(execucaoId);

  if (!execucao || execucao.pacienteId !== id) notFound();

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
            {execucao.paciente.nome}
            {" · "}
            {formatarDataHora(execucao.data)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {execucao.tipo === "AVALIACAO" && execucao.retornos.length > 0 && (
            <ComparacaoRapidaDialog
              avaliacaoId={execucaoId}
              avaliacaoData={execucao.data}
              retornos={execucao.retornos}
            />
          )}
          {execucao.tipo === "AVALIACAO" && (
            <Button asChild size="sm">
              <Link href={`/pacientes/${id}/exames/${execucaoId}/retorno`}>
                <Plus />
                Novo retorno
              </Link>
            </Button>
          )}
          {execucao.tipo === "AVALIACAO" && execucao.retornos.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/pacientes/${id}/exames/${execucaoId}/comparar`}>
                <GitCompare />
                Comparar
              </Link>
            </Button>
          )}
          <ExecucaoDetailActions
            id={execucaoId}
            pacienteId={id}
            tipo={execucao.tipo}
          />
        </div>
      </div>

      <ExecucaoValores execucao={execucao} />

      {execucao.tipo === "AVALIACAO" && execucao.retornos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Retornos</h2>
          {execucao.retornos.map((retorno) => (
            <Card key={retorno.id} className="p-0">
              <Link
                href={`/pacientes/${id}/exames/${retorno.id}`}
                className="group flex items-center justify-between gap-2 p-4 transition-colors hover:bg-primary/5"
              >
                <p className="text-sm">
                  {formatarDataHora(retorno.data)}
                </p>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Card>
          ))}
        </div>
      )}

      {execucao.tipo === "RETORNO" && execucao.avaliacao && (
        <p className="text-sm text-muted-foreground">
          Retorno da avaliação de{" "}
          {formatarDataHora(execucao.avaliacao.data)}
          {" — "}
          <Link
            href={`/pacientes/${id}/exames/${execucao.avaliacao.id}`}
            className="underline"
          >
            ver avaliação original
          </Link>
        </p>
      )}
    </div>
  );
}
