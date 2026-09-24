"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SerieNumerica } from "@/lib/comparacao-rapida";
import { formatarData } from "@/lib/format";

const config: ChartConfig = {
  valor: { label: "Valor", color: "var(--chart-1)" },
};

export function ComparacaoRapidaGrafico({
  serie,
  execucoes,
}: {
  serie: SerieNumerica;
  execucoes: { id: string; data: Date }[];
}) {
  const dados = serie.pontos.map((ponto, index) => ({
    data: formatarData(execucoes[index].data),
    valor: ponto.valor,
  }));

  const valoresPreenchidos = serie.pontos
    .map((p) => p.valor)
    .filter((v): v is number => v !== null);
  const min = Math.min(...valoresPreenchidos);
  const max = Math.max(...valoresPreenchidos);
  const sufixo = serie.unidade ? ` ${serie.unidade}` : "";

  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <p className="text-xs font-medium">{serie.titulo}</p>
      <ChartContainer config={config} className="aspect-auto h-[160px] w-full">
        <LineChart data={dados} margin={{ left: 4, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="data"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <span className="font-mono font-medium tabular-nums">
                    {value === null || value === undefined ? "—" : `${value}${sufixo}`}
                  </span>
                )}
              />
            }
          />
          <Line
            dataKey="valor"
            type="monotone"
            stroke="var(--color-valor)"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls={false}
          />
        </LineChart>
      </ChartContainer>
      {valoresPreenchidos.length > 0 && (
        <p className="text-right text-xs text-muted-foreground">
          mín: {min}
          {sufixo} · máx: {max}
          {sufixo}
        </p>
      )}
    </div>
  );
}
