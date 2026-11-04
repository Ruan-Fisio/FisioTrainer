import { Suspense } from "react";
import { getModeloParaEdicao } from "@/actions/contratos";
import { ContratosLista } from "@/components/contratos/contratos-lista";
import { STATUS_CONTRATO_LABEL } from "@/components/contratos/contrato-status-badge";
import { ContratosTabs } from "@/components/contratos/contratos-tabs";
import { ModeloContratoForm } from "@/components/contratos/modelo-contrato-form";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { SearchInput } from "@/components/filters/search-input";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import type { StatusContrato } from "@/generated/prisma/client";
import { parseListParam } from "@/lib/search-params";

type PageProps = {
  searchParams: Promise<{ tab?: string; page?: string; q?: string; status?: string }>;
};

const OPCOES_STATUS = (Object.keys(STATUS_CONTRATO_LABEL) as StatusContrato[]).map((id) => ({
  id,
  label: STATUS_CONTRATO_LABEL[id],
}));

async function ModeloLoader() {
  const modelo = await getModeloParaEdicao();
  return <ModeloContratoForm {...modelo} />;
}

export default async function ContratosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab === "modelo" ? "modelo" : "lista";
  const page = Number(params.page ?? "1") || 1;
  const search = params.q ?? "";
  const status = parseListParam(params.status).filter((s): s is StatusContrato =>
    Object.hasOwn(STATUS_CONTRATO_LABEL, s),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Contratos</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe as assinaturas dos planos atribuídos e edite o modelo do contrato.
        </p>
      </div>

      <ContratosTabs
        tab={tab}
        lista={
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput defaultValue={search} placeholder="Buscar por paciente ou plano..." />
              <MultiSelectFilter
                paramName="status"
                options={OPCOES_STATUS}
                placeholder="Situação"
                defaultValue={status}
              />
            </div>
            <Suspense key={`${page}-${search}-${status.join()}`} fallback={<TableSkeleton />}>
              <ContratosLista page={page} search={search} status={status} />
            </Suspense>
          </div>
        }
        modelo={
          <Suspense fallback={<TableSkeleton />}>
            <ModeloLoader />
          </Suspense>
        }
      />
    </div>
  );
}
