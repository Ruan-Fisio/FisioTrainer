import { Suspense } from "react";
import type { Metadata } from "next";
import { after } from "next/server";
import { PeriodoFilter } from "@/components/filters/periodo-filter";
import {
  BlocoAcoes,
  BlocoHorario,
  BlocoPlanos,
  BlocoSerie,
  BlocoSkeleton,
  BlocoTelas,
  BlocoUsuarios,
} from "@/components/metricas/blocos";
import { purgarAntigos } from "@/lib/metricas";
import { PERIODOS_DIAS, excedeRetencaoBrutos, parsePeriodo } from "@/lib/metricas-periodo";

// Área interna: fora do menu e fora dos buscadores (spec 001).
export const metadata: Metadata = {
  title: "Métricas de uso",
  robots: { index: false, follow: false },
};

type PageProps = { searchParams: Promise<{ dias?: string }> };

export default async function MetricsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dias = parsePeriodo(params.dias);

  // Purga dos eventos brutos >90 dias depois da resposta; idempotente (CA8).
  after(() => purgarAntigos());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Métricas de uso</h1>
          <p className="text-sm text-muted-foreground">
            Painel interno — telas mais acessadas, ações-chave e planos mais usados.
          </p>
        </div>
        <PeriodoFilter dias={dias} opcoes={PERIODOS_DIAS} />
      </div>

      {excedeRetencaoBrutos(dias) && (
        <p role="note" className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Usuários ativos e horário de pico cobrem apenas os últimos 90 dias (retenção dos eventos brutos).
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        <Suspense key={`serie-${dias}`} fallback={<BlocoSkeleton />}>
          <BlocoSerie dias={dias} />
        </Suspense>
        <Suspense key={`usuarios-${dias}`} fallback={<BlocoSkeleton />}>
          <BlocoUsuarios dias={dias} />
        </Suspense>
        <Suspense key={`acoes-${dias}`} fallback={<BlocoSkeleton />}>
          <BlocoAcoes dias={dias} />
        </Suspense>
        <Suspense key={`planos-${dias}`} fallback={<BlocoSkeleton />}>
          <BlocoPlanos dias={dias} />
        </Suspense>
        <Suspense key={`horario-${dias}`} fallback={<BlocoSkeleton />}>
          <BlocoHorario dias={dias} />
        </Suspense>
        <Suspense key={`clinica-${dias}`} fallback={<BlocoSkeleton />}>
          <BlocoTelas area="CLINICA" dias={dias} />
        </Suspense>
        <Suspense key={`portal-${dias}`} fallback={<BlocoSkeleton />}>
          <BlocoTelas area="PORTAL" dias={dias} />
        </Suspense>
        <Suspense key={`pre-${dias}`} fallback={<BlocoSkeleton />}>
          <BlocoTelas area="PRE_CADASTRO" dias={dias} />
        </Suspense>
      </div>
    </div>
  );
}
