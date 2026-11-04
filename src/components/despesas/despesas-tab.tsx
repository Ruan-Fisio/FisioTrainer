import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiGrid, type Kpi } from "@/components/dashboard/kpi-grid";
import { DespesaRowActions } from "@/components/despesas/despesa-row-actions";
import { DespesasTable } from "@/components/despesas/despesas-table";
import { MesFilter } from "@/components/filters/mes-filter";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { SearchInput } from "@/components/filters/search-input";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { getResumoDespesas } from "@/actions/despesas";
import {
  CATEGORIAS_DESPESA,
  LABEL_CATEGORIA_DESPESA,
  rotuloMesExtenso,
  type FiltrosDespesas,
} from "@/lib/despesas";
import { mesReferencia } from "@/lib/financeiro";
import { formatarData, formatarMoeda } from "@/lib/format";

const OPCOES_CATEGORIA = CATEGORIAS_DESPESA.map((c) => ({
  id: c,
  label: LABEL_CATEGORIA_DESPESA[c],
}));
const OPCOES_STATUS = [
  { id: "PENDENTE", label: "A pagar" },
  { id: "PAGO", label: "Paga" },
];

export async function DespesasTab({ filtros, page }: { filtros: FiltrosDespesas; page: number }) {
  const { resumo, atrasadasOutrosMeses } = await getResumoDespesas(filtros.mes);

  const kpis: Kpi[] = [
    {
      label: "Total do mês",
      value: formatarMoeda(resumo.total),
      hint: `${resumo.qtd} despesa${resumo.qtd === 1 ? "" : "s"}`,
      icon: Receipt,
    },
    { label: "Já pago", value: formatarMoeda(resumo.pago), icon: CheckCircle2 },
    { label: "A pagar", value: formatarMoeda(resumo.aPagar), icon: CalendarClock },
    {
      label: "Em atraso",
      value: formatarMoeda(resumo.atrasado),
      hint: `${resumo.qtdAtrasadas} conta${resumo.qtdAtrasadas === 1 ? "" : "s"}, de qualquer mês`,
      icon: AlertTriangle,
      tone: resumo.qtdAtrasadas > 0 ? "danger" : "default",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <MesFilter mes={filtros.mes} mesAtual={mesReferencia(new Date())} />
        <Button asChild>
          <Link href="/dashboard/despesas/nova">
            <Plus className="size-4" />
            Nova despesa
          </Link>
        </Button>
      </div>

      <KpiGrid kpis={kpis} className="lg:grid-cols-4" />

      {atrasadasOutrosMeses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Contas atrasadas de outros meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {atrasadasOutrosMeses.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      Venceu em {formatarData(d.data)} · {formatarMoeda(d.valor)}
                    </p>
                  </div>
                  <DespesaRowActions id={d.id} pago={false} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {resumo.porCategoria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Para onde vai o dinheiro</CardTitle>
            <CardDescription>Despesas de {rotuloMesExtenso(filtros.mes)}, por categoria.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {resumo.porCategoria.map((c) => (
                <li key={c.categoria}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{c.label}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatarMoeda(c.valor)}{" "}
                      <span className="text-muted-foreground">· {c.pct}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <SearchInput placeholder="Buscar despesa..." defaultValue={filtros.q} />
        <MultiSelectFilter
          paramName="categorias"
          options={OPCOES_CATEGORIA}
          placeholder="Categoria"
          defaultValue={filtros.categorias}
        />
        <MultiSelectFilter
          paramName="status"
          options={OPCOES_STATUS}
          placeholder="Pagamento"
          defaultValue={filtros.status}
        />
      </div>

      <Suspense key={JSON.stringify({ filtros, page })} fallback={<TableSkeleton />}>
        <DespesasTable filtros={filtros} page={page} />
      </Suspense>
    </div>
  );
}
