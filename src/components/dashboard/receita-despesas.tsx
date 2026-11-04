"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ComparativoReceitaDespesa } from "@/lib/despesas";
import { formatarMoeda } from "@/lib/format";
import { cn } from "@/lib/utils";

const config: ChartConfig = {
  receita: { label: "Receita", color: "var(--chart-1)" },
  despesa: { label: "Despesas", color: "var(--chart-2)" },
};

function Linha({
  rotulo,
  valor,
  sinal,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  sinal?: "+" | "−";
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 py-1.5 text-sm",
        destaque && "border-t font-semibold",
      )}
    >
      <span className={destaque ? undefined : "text-muted-foreground"}>{rotulo}</span>
      <span className={cn("tabular-nums", destaque && valor < 0 && "text-destructive")}>
        {sinal && <span className="mr-1 text-muted-foreground">{sinal}</span>}
        {formatarMoeda(valor)}
      </span>
    </div>
  );
}

export function ReceitaDespesas({ comparativo }: { comparativo: ComparativoReceitaDespesa }) {
  const { mes, porMes } = comparativo;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Resultado do mês</CardTitle>
          <CardDescription>
            {mes.comprometimentoPct === null
              ? "Ainda sem receita neste mês."
              : `As despesas pagas consumiram ${mes.comprometimentoPct}% do que entrou.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          <Linha rotulo="Recebido" valor={mes.recebido} sinal="+" />
          <Linha rotulo="Despesas pagas" valor={mes.despesasPagas} sinal="−" />
          <Linha rotulo="Saldo até agora" valor={mes.saldo} destaque />
          <div className="h-3" />
          <Linha rotulo="Ainda a receber" valor={mes.aReceber} sinal="+" />
          <Linha rotulo="Ainda a pagar, com atrasadas" valor={mes.aPagar} sinal="−" />
          <Linha rotulo="Saldo previsto" valor={mes.saldoPrevisto} destaque />
          <Link
            href="/dashboard?tab=despesas"
            className="mt-3 flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Gerenciar despesas
            <ArrowUpRight className="size-3.5" />
          </Link>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Receita x despesas</CardTitle>
          <CardDescription>
            O que entrou e o que saiu em cada um dos últimos 12 meses, pela data do pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
            <BarChart data={porMes} margin={{ left: 4, right: 4 }} barGap={2}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item, index) => (
                      <div className="flex w-full flex-col gap-1">
                        <div className="flex w-full justify-between gap-3">
                          <span className="text-muted-foreground">
                            {config[String(name)]?.label ?? name}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {formatarMoeda(Number(value))}
                          </span>
                        </div>
                        {index === 1 && (
                          <div className="flex w-full justify-between gap-3 border-t pt-1">
                            <span className="text-muted-foreground">Saldo</span>
                            <span className="font-mono font-medium tabular-nums">
                              {formatarMoeda(Number(item?.payload?.saldo ?? 0))}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="receita" fill="var(--color-receita)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" fill="var(--color-despesa)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Ver valores mês a mês
            </summary>
            <table className="mt-2 w-full">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 font-medium">Mês</th>
                  <th className="py-1.5 text-right font-medium">Receita</th>
                  <th className="py-1.5 text-right font-medium">Despesas</th>
                  <th className="py-1.5 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {[...porMes].reverse().map((m) => (
                  <tr key={m.mes} className="border-b last:border-0">
                    <td className="py-1.5">{m.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatarMoeda(m.receita)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatarMoeda(m.despesa)}</td>
                    <td
                      className={cn(
                        "py-1.5 text-right tabular-nums",
                        m.saldo < 0 && "text-destructive",
                      )}
                    >
                      {formatarMoeda(m.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
