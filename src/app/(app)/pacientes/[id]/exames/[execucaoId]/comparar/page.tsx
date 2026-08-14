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
import { BaixarPdfButton } from "@/components/exame-execucoes/baixar-pdf-button";
import { RelatorioBarChart } from "@/components/exame-execucoes/relatorio-bar-chart";
import { cn } from "@/lib/utils";
import {
  montarDadosPaciente,
  montarHistoricoClinico,
  montarSessao,
  graficosDaSecao,
  type Classificacao,
} from "@/lib/relatorio-comparativo";

function formatarSinal(valor: number) {
  const arredondado = Math.round(valor * 10) / 10;
  return arredondado > 0 ? `+${arredondado}` : `${arredondado}`;
}

function classificacaoClasses(classificacao: Classificacao | null) {
  if (classificacao === "proximo")
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (classificacao === "moderado")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  if (classificacao === "distante")
    return "bg-destructive/10 text-destructive";
  return "text-muted-foreground";
}

function InfoTable({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { label: string; valor: string }[];
}) {
  if (linhas.length === 0) return null;

  return (
    <Card className="break-inside-avoid">
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableBody>
            {linhas.map((linha) => (
              <TableRow key={linha.label}>
                <TableCell className="w-1/3 font-medium text-primary">
                  {linha.label}
                </TableCell>
                <TableCell>{linha.valor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
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
    avaliacao.pacienteId !== id ||
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
          <Link href={`/pacientes/${id}/exames/${execucaoId}`}>
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

  const paciente = comparativo.paciente;

  const dadosPacienteLinhas = montarDadosPaciente(paciente);
  const historicoLinhas = montarHistoricoClinico(paciente);
  const sessaoLinhas = montarSessao(
    comparativo.exame.nome,
    formatarData(comparativo.avaliacaoData),
    formatarData(comparativo.retornoData),
  );

  const graficos = comparativo.secoes.flatMap((secao) => graficosDaSecao(secao));
  const temLinhaComIdeal = comparativo.secoes.some((secao) =>
    secao.linhas.some((linha) => linha.valorIdeal !== null),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href={`/pacientes/${id}/exames/${execucaoId}`}>
              <ChevronLeft />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            Comparativo — {comparativo.exame.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {comparativo.paciente.nome}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RetornoSelect
            retornos={avaliacao.retornos}
            value={retornoSelecionadoId}
          />
          <BaixarPdfButton
            execucaoId={execucaoId}
            retornoId={retornoSelecionadoId}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <InfoTable titulo="Dados do paciente" linhas={dadosPacienteLinhas} />
        <InfoTable titulo="Histórico clínico" linhas={historicoLinhas} />
        <InfoTable titulo="Sessão" linhas={sessaoLinhas} />
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
                        <span className="flex items-center gap-1.5">
                          {linha.rotulo}
                          {linha.lado && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {linha.lado}
                            </span>
                          )}
                        </span>
                        {linha.contexto && (
                          <p className="text-xs font-normal text-muted-foreground">
                            {linha.contexto}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{linha.valorIdeal ?? "—"}</TableCell>
                      <TableCell>{linha.avaliacaoValor ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-medium",
                            classificacaoClasses(linha.classificacaoAvaliacao),
                          )}
                        >
                          {linha.avaliacaoDist !== null
                            ? formatarSinal(linha.avaliacaoDist)
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell>{linha.retornoValor ?? "—"}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-medium",
                            classificacaoClasses(linha.classificacaoRetorno),
                          )}
                        >
                          {linha.retornoDist !== null
                            ? formatarSinal(linha.retornoDist)
                            : "—"}
                        </span>
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

      {temLinhaComIdeal && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-emerald-500/70" />
            Próximo do ideal (dist. ≤ 5)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-amber-500/70" />
            Distância moderada (5–15)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-destructive/70" />
            Distante do ideal (&gt; 15)
          </span>
        </div>
      )}

      {graficos.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">
            Gráficos Consolidados — Avaliação x Retorno
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {graficos.map((grafico) => (
              <RelatorioBarChart
                key={grafico.titulo}
                titulo={grafico.titulo}
                itens={grafico.itens}
                sufixo={grafico.sufixo}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
