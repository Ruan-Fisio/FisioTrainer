import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getExecucao, getComparativo } from "@/actions/exame-execucoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RetornoSelect } from "@/components/exame-execucoes/retorno-select";
import { PrintButton } from "@/components/exame-execucoes/print-button";
import { cn } from "@/lib/utils";
import type { Classificacao } from "@/lib/relatorio-comparativo";

function formatarSinal(valor: number) {
  const arredondado = Math.round(valor * 10) / 10;
  return arredondado > 0 ? `+${arredondado}` : `${arredondado}`;
}

function classificacaoClasses(classificacao: Classificacao | null) {
  if (classificacao === "proximo") return "text-emerald-600 dark:text-emerald-400";
  if (classificacao === "moderado") return "text-amber-600 dark:text-amber-400";
  if (classificacao === "distante") return "text-destructive";
  return "text-muted-foreground";
}

export default async function CompararExecucaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; execucaoId: string }>;
  searchParams: Promise<{ retornoId?: string }>;
}) {
  const { id, execucaoId } = await params;
  const { retornoId } = await searchParams;

  const avaliacao = await getExecucao(execucaoId);

  if (
    !avaliacao ||
    avaliacao.clienteId !== id ||
    avaliacao.tipo !== "AVALIACAO"
  ) {
    notFound();
  }

  if (avaliacao.retornos.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Comparativo</h1>
          <p className="text-sm text-muted-foreground">
            Este exame ainda não possui retornos para comparar.
          </p>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link href={`/clientes/${id}/exames/${execucaoId}`}>
            <ChevronLeft />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  const retornoSelecionadoId = retornoId ?? avaliacao.retornos[0].id;
  const comparativo = await getComparativo(execucaoId, retornoSelecionadoId);

  if (!comparativo) notFound();

  const formatarData = (data: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(data);

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href={`/clientes/${id}/exames/${execucaoId}`}>
              <ChevronLeft />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            Comparativo — {comparativo.exame.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {comparativo.cliente.nome}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RetornoSelect
            retornos={avaliacao.retornos}
            value={retornoSelecionadoId}
          />
          <PrintButton />
        </div>
      </div>

      <div className="hidden flex-col gap-1 print:flex">
        <h1 className="text-xl font-semibold">
          Comparativo — {comparativo.exame.nome}
        </h1>
        <p className="text-sm text-muted-foreground">
          {comparativo.cliente.nome}
        </p>
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>Avaliação: {formatarData(comparativo.avaliacaoData)}</p>
        <p>Retorno: {formatarData(comparativo.retornoData)}</p>
      </div>

      {comparativo.secoes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum valor preenchido em comum entre a avaliação e o retorno
          selecionado.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {comparativo.secoes.map((secao) => (
          <Card key={secao.id} className="break-inside-avoid">
            <CardHeader>
              <CardTitle className="text-base">{secao.nome}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo</TableHead>
                    <TableHead>Valor ideal</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Dist.</TableHead>
                    <TableHead>Retorno</TableHead>
                    <TableHead>Dist.</TableHead>
                    <TableHead>Progresso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secao.linhas.map((linha) => (
                    <TableRow key={linha.chave}>
                      <TableCell className="font-medium">
                        {linha.rotulo}
                        {linha.contexto && (
                          <p className="text-xs font-normal text-muted-foreground">
                            {linha.contexto}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{linha.valorIdeal ?? "—"}</TableCell>
                      <TableCell>{linha.avaliacaoValor ?? "—"}</TableCell>
                      <TableCell
                        className={classificacaoClasses(
                          linha.classificacaoAvaliacao,
                        )}
                      >
                        {linha.avaliacaoDist !== null
                          ? formatarSinal(linha.avaliacaoDist)
                          : "—"}
                      </TableCell>
                      <TableCell>{linha.retornoValor ?? "—"}</TableCell>
                      <TableCell>
                        {linha.retornoDist !== null
                          ? formatarSinal(linha.retornoDist)
                          : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "font-medium",
                          linha.progresso === null &&
                            "font-normal text-muted-foreground",
                          linha.progresso !== null &&
                            linha.progresso > 0 &&
                            "text-emerald-600 dark:text-emerald-400",
                          linha.progresso !== null &&
                            linha.progresso < 0 &&
                            "text-destructive",
                        )}
                      >
                        {linha.progresso !== null
                          ? formatarSinal(linha.progresso)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
