import { Suspense } from "react";
import { listCobrancasPendentes } from "@/actions/cobrancas";
import { CobrancasList } from "@/components/cobrancas/cobrancas-list";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

async function CobrancasListLoader() {
  const cobrancas = await listCobrancasPendentes();
  return <CobrancasList cobrancas={cobrancas} />;
}

export default function CobrancasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cobranças</h1>
        <p className="text-sm text-muted-foreground">
          Todas as cobranças pendentes de todos os pacientes.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <CobrancasListLoader />
      </Suspense>
    </div>
  );
}
