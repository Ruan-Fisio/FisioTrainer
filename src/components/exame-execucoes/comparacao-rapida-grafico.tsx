"use client";

import { useId } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { resumirSerie, type SerieNumerica } from "@/lib/comparacao-rapida";
import { formatarData } from "@/lib/format";

const config: ChartConfig = {
  valor: { label: "Valor", color: "var(--chart-1)" },
};

function formatarNumero(valor: number) {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace(".", ",");
}

type PontoProps = {
  cx?: number | string;
  cy?: number | string;
  x?: number | string;
  y?: number | string;
  index?: number;
  value?: unknown;
  key?: React.Key | null;
};

export function ComparacaoRapidaGrafico({
  serie,
  execucoes,
}: {
  serie: SerieNumerica;
  execucoes: { id: string; data: Date }[];
}) {
  const gradId = useId();
  const dados = serie.pontos.map((ponto, index) => ({
    data: formatarData(execucoes[index].data),
    valor: ponto.valor,
  }));

  const sufixo = serie.unidade ? ` ${serie.unidade}` : "";
  const resumo = resumirSerie(serie.pontos);

  // Rótulos só nas pontas (primeiro e último valor preenchido).
  const indicesPreenchidos = dados.flatMap((d, i) => (d.valor !== null ? [i] : []));
  const primeiro = indicesPreenchidos[0];
  const ultimo = indicesPreenchidos[indicesPreenchidos.length - 1];

  const queda = resumo?.direcao === "queda";
  const corTendencia = queda ? "text-emerald-600" : "text-accent";
  const Seta =
    resumo?.direcao === "alta" ? ArrowUpRight : queda ? ArrowDownRight : ArrowRight;
  const rotulo = queda ? "Redução no período" : "Evolução no período";

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-gradient-to-br from-card to-muted/40 p-4 shadow-sm ring-1 ring-foreground/10">
      <div>
        <p className="text-base leading-tight font-bold text-foreground">{serie.titulo}</p>
        {serie.unidade && (
          <p className="text-xs text-muted-foreground">({serie.unidade})</p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <ChartContainer config={config} className="aspect-auto h-[170px] min-w-0 flex-1">
          <AreaChart data={dados} margin={{ left: 0, right: 16, top: 28, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.5} />
            <XAxis
              dataKey="data"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
              padding={{ left: 16, right: 16 }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              tickMargin={4}
              domain={["auto", "auto"]}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono font-medium tabular-nums">
                      {value === null || value === undefined
                        ? "—"
                        : `${formatarNumero(Number(value))}${sufixo}`}
                    </span>
                  )}
                />
              }
            />
            <Area
              dataKey="valor"
              type="monotone"
              stroke="var(--color-valor)"
              strokeWidth={2.5}
              fill={`url(#${gradId})`}
              connectNulls={false}
              isAnimationActive={false}
              dot={(props: PontoProps) => {
                const { index, key } = props;
                const cx = Number(props.cx);
                const cy = Number(props.cy);
                if (Number.isNaN(cx) || Number.isNaN(cy)) return <g key={key} />;
                const destaque = index === primeiro || index === ultimo;
                return (
                  <circle
                    key={key}
                    cx={cx}
                    cy={cy}
                    r={destaque ? 5 : 3}
                    fill="var(--card)"
                    stroke="var(--accent)"
                    strokeWidth={destaque ? 3 : 2}
                  />
                );
              }}
              label={(props: PontoProps) => {
                const { index, value } = props;
                const px = Number(props.cx ?? props.x);
                const py = Number(props.cy ?? props.y);
                if (Number.isNaN(px) || Number.isNaN(py) || value == null) return <g />;
                if (index !== primeiro && index !== ultimo) return <g />;
                const texto = `${formatarNumero(Number(value))}${sufixo}`;
                const largura = texto.length * 7 + 16;
                return (
                  <g>
                    <rect
                      x={px - largura / 2}
                      y={py - 30}
                      width={largura}
                      height={22}
                      rx={6}
                      fill="var(--primary)"
                    />
                    <text
                      x={px}
                      y={py - 15}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill="var(--primary-foreground)"
                    >
                      {texto}
                    </text>
                  </g>
                );
              }}
            />
          </AreaChart>
        </ChartContainer>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-muted/60 px-4 py-3 text-center sm:w-32">
          {resumo ? (
            <>
              <Seta className={`size-6 ${corTendencia}`} strokeWidth={3} />
              <p className="text-xl leading-none font-bold text-foreground tabular-nums">
                {resumo.delta > 0 ? "+" : ""}
                {formatarNumero(resumo.delta)}
                {sufixo}
              </p>
              {resumo.percentual !== null && (
                <p className={`text-base font-bold tabular-nums ${corTendencia}`}>
                  {resumo.percentual > 0 ? "+" : ""}
                  {resumo.percentual}%
                </p>
              )}
              <div className="mt-1 w-full border-t pt-1 text-xs text-muted-foreground">
                {resumo.direcao === "estavel" ? "Sem variação no período" : rotulo}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sem dados suficientes para comparar
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
