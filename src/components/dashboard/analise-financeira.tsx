"use client";

import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Receipt,
  CalendarClock,
  ArrowUpRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { KpiGrid, type Kpi } from "@/components/dashboard/kpi-grid";
import {
  CATEGORIAS_RECEITA,
  COR_CATEGORIA_RECEITA,
  LABEL_CATEGORIA_RECEITA,
  type AnaliseFinanceira,
  type CategoriaReceita,
} from "@/lib/financeiro";
import { formatarData, formatarMoeda } from "@/lib/format";
import type { CobrancaAtrasada } from "@/actions/dashboard";

const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const eixoMoeda = (v: number) => (v ? moedaCompacta.format(v) : "");

type Props = {
  analise: AnaliseFinanceira;
  atrasadas: CobrancaAtrasada[];
};

export function AnaliseFinanceira({ analise, atrasadas }: Props) {
  const { kpis } = analise;

  const cards: Kpi[] = [
    {
      label: "Recebido no mês",
      value: formatarMoeda(kpis.recebidoMes),
      icon: Wallet,
    },
    {
      label: "A receber no mês",
      value: formatarMoeda(kpis.aReceberMes),
      hint: "Cobranças a vencer ainda neste mês",
      icon: CalendarClock,
    },
    {
      label: "Em atraso",
      value: formatarMoeda(kpis.totalAtrasado),
      hint: `${atrasadas.length} cobrança${atrasadas.length === 1 ? "" : "s"}`,
      icon: AlertTriangle,
      tone: "danger",
    },
    {
      label: "Ticket médio",
      value: formatarMoeda(kpis.ticketMedio),
      hint: "Por cobrança paga (12 meses)",
      icon: Receipt,
    },
    {
      label: "Recebido em 12 meses",
      value: formatarMoeda(kpis.recebido12m),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <KpiGrid kpis={cards} className="lg:grid-cols-3 xl:grid-cols-5" />

      <ReceitaPorMesCard analise={analise} eixoMoeda={eixoMoeda} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ModalidadeMesCard analise={analise} />
        <ModalidadeEvolucaoCard analise={analise} eixoMoeda={eixoMoeda} />
      </div>

      <AReceberCard analise={analise} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RankingCard
          titulo="Planos que mais faturam"
          descricao="Recebido nos últimos 12 meses"
          itens={analise.topPlanos.map((p) => ({
            chave: p.nome,
            rotulo: p.nome,
            sub: `${p.qtd} cobrança${p.qtd === 1 ? "" : "s"}`,
            valor: p.valor,
          }))}
        />
        <RankingCard
          titulo="Pacientes que mais faturam"
          descricao="Recebido nos últimos 12 meses"
          itens={analise.topPacientes.map((p) => ({
            chave: p.pacienteId,
            rotulo: p.nome,
            valor: p.valor,
            href: `/pacientes/${p.pacienteId}`,
          }))}
        />
      </div>

      <CobrancasAtrasoCard atrasadas={atrasadas} />
    </div>
  );
}

function ReceitaPorMesCard({
  analise,
  eixoMoeda,
}: {
  analise: AnaliseFinanceira;
  eixoMoeda: (v: number) => string;
}) {
  const config: ChartConfig = {
    recebido: { label: "Recebido", color: "var(--chart-1)" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita por mês</CardTitle>
        <CardDescription>
          Valores efetivamente recebidos (cobranças pagas), últimos 12 meses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
          <AreaChart data={analise.receitaPorMes} margin={{ left: 4, right: 4 }}>
            <defs>
              <linearGradient id="fillRecebido" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-recebido)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-recebido)"
                  stopOpacity={0.03}
                />
              </linearGradient>
            </defs>
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
                  formatter={(value, _name, item) => (
                    <div className="flex w-full justify-between gap-3">
                      <span className="text-muted-foreground">Recebido</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatarMoeda(Number(value))}
                        <span className="ml-1 text-muted-foreground">
                          ({item?.payload?.qtd ?? 0})
                        </span>
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Area
              dataKey="recebido"
              type="monotone"
              stroke="var(--color-recebido)"
              strokeWidth={2}
              fill="url(#fillRecebido)"
            />
          </AreaChart>
        </ChartContainer>
        <YAxisHint format={eixoMoeda} data={analise.receitaPorMes.map((m) => m.recebido)} />
      </CardContent>
    </Card>
  );
}

/** Recharts YAxis fica apertado em mobile; mostramos min/max abaixo do gráfico. */
function YAxisHint({
  data,
  format,
}: {
  data: number[];
  format: (v: number) => string;
}) {
  const max = Math.max(0, ...data);
  if (max === 0) return null;
  return (
    <p className="mt-2 text-right text-xs text-muted-foreground">
      pico: {format(max)}
    </p>
  );
}

function ModalidadeMesCard({ analise }: { analise: AnaliseFinanceira }) {
  const dados = analise.receitaPorModalidadeMes;
  const config: ChartConfig = Object.fromEntries(
    CATEGORIAS_RECEITA.map((c) => [
      c,
      { label: LABEL_CATEGORIA_RECEITA[c], color: COR_CATEGORIA_RECEITA[c] },
    ]),
  );
  const total = dados.reduce((s, d) => s + d.valor, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>De onde vem o dinheiro</CardTitle>
        <CardDescription>
          Receita recebida neste mês, por modalidade.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum recebimento neste mês ainda.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ChartContainer
              config={config}
              className="aspect-square h-[180px] w-[180px] shrink-0"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => (
                        <div className="flex w-full justify-between gap-3">
                          <span className="text-muted-foreground">
                            {LABEL_CATEGORIA_RECEITA[name as CategoriaReceita] ??
                              name}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {formatarMoeda(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={dados}
                  dataKey="valor"
                  nameKey="categoria"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={2}
                >
                  {dados.map((d) => (
                    <Cell
                      key={d.categoria}
                      fill={COR_CATEGORIA_RECEITA[d.categoria]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="flex w-full flex-col gap-2">
              {dados.map((d) => (
                <li
                  key={d.categoria}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ background: COR_CATEGORIA_RECEITA[d.categoria] }}
                    />
                    {d.label}
                  </span>
                  <span className="tabular-nums">
                    {formatarMoeda(d.valor)}{" "}
                    <span className="text-muted-foreground">· {d.pct}%</span>
                  </span>
                </li>
              ))}
              <li className="mt-1 flex items-center justify-between gap-2 border-t pt-2 text-sm font-medium">
                <span>Total</span>
                <span className="tabular-nums">{formatarMoeda(total)}</span>
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModalidadeEvolucaoCard({
  analise,
  eixoMoeda,
}: {
  analise: AnaliseFinanceira;
  eixoMoeda: (v: number) => string;
}) {
  const config: ChartConfig = Object.fromEntries(
    CATEGORIAS_RECEITA.map((c) => [
      c,
      { label: LABEL_CATEGORIA_RECEITA[c], color: COR_CATEGORIA_RECEITA[c] },
    ]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução por modalidade</CardTitle>
        <CardDescription>
          Receita recebida nos últimos 6 meses, empilhada por modalidade.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
          <BarChart data={analise.receitaModalidadePorMes} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full justify-between gap-3">
                      <span className="text-muted-foreground">
                        {LABEL_CATEGORIA_RECEITA[name as CategoriaReceita] ??
                          name}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatarMoeda(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            {CATEGORIAS_RECEITA.map((c, i) => (
              <Bar
                key={c}
                dataKey={c}
                stackId="receita"
                fill={COR_CATEGORIA_RECEITA[c]}
                radius={
                  i === CATEGORIAS_RECEITA.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                }
              />
            ))}
          </BarChart>
        </ChartContainer>
        <YAxisHint
          format={eixoMoeda}
          data={analise.receitaModalidadePorMes.map((m) =>
            CATEGORIAS_RECEITA.reduce((s, c) => s + m[c], 0),
          )}
        />
      </CardContent>
    </Card>
  );
}

function AReceberCard({ analise }: { analise: AnaliseFinanceira }) {
  const config: ChartConfig = {
    valor: { label: "A receber", color: "var(--chart-2)" },
  };
  const total = analise.aReceberPorMes.reduce((s, m) => s + m.valor, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>A receber nos próximos meses</CardTitle>
        <CardDescription>
          Cobranças já lançadas, ainda a vencer — {formatarMoeda(total)} no total.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer config={config} className="aspect-auto h-[200px] w-full">
          <BarChart data={analise.aReceberPorMes} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <div className="flex w-full justify-between gap-3">
                      <span className="text-muted-foreground">A receber</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatarMoeda(Number(value))}
                        <span className="ml-1 text-muted-foreground">
                          ({item?.payload?.qtd ?? 0})
                        </span>
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>

        <ul className="flex flex-col divide-y text-sm">
          {analise.aReceberPorMes.map((m) => (
            <li
              key={m.mes}
              className="flex items-center justify-between gap-2 py-2"
            >
              <span className="font-medium capitalize">{m.label}</span>
              {m.valor > 0 ? (
                <Link
                  href="/cobrancas"
                  className="flex items-center gap-2 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  <span className="tabular-nums text-foreground">
                    {formatarMoeda(m.valor)}
                  </span>
                  <span>
                    · {m.qtd} cobrança{m.qtd === 1 ? "" : "s"}
                  </span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

type RankingItem = {
  chave: string;
  rotulo: string;
  sub?: string;
  valor: number;
  href?: string;
};

function RankingCard({
  titulo,
  descricao,
  itens,
}: {
  titulo: string;
  descricao: string;
  itens: RankingItem[];
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {itens.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados no período.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {itens.map((item) => {
              const conteudo = (
                <>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{item.rotulo}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatarMoeda(item.valor)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(item.valor / max) * 100}%` }}
                    />
                  </div>
                  {item.sub && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.sub}
                    </p>
                  )}
                </>
              );
              return (
                <li key={item.chave}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-primary/5"
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <div className="px-2 py-1.5 -mx-2">{conteudo}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CobrancasAtrasoCard({
  atrasadas,
}: {
  atrasadas: CobrancaAtrasada[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          Cobranças em atraso
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {atrasadas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma cobrança em atraso.
          </p>
        ) : (
          atrasadas.map((cobranca) => (
            <Link
              key={cobranca.id}
              href={`/pacientes/${cobranca.pacienteId}`}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-primary/5"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {cobranca.pacienteNome}
                </span>
                <span className="text-xs text-muted-foreground">
                  {cobranca.planoNome} · venceu em{" "}
                  {formatarData(cobranca.vencimento)}
                </span>
              </div>
              <Badge variant="destructive">
                {formatarMoeda(cobranca.valor)}
              </Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
