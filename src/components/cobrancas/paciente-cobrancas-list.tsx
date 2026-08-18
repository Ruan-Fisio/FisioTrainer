import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CobrancaRowActions } from "@/components/cobrancas/cobranca-row-actions";
import { formatarData, formatarMoeda } from "@/lib/format";
import type { getCobrancasByPaciente } from "@/actions/cobrancas";

type Cobranca = Awaited<ReturnType<typeof getCobrancasByPaciente>>[number];

export function statusCobranca(cobranca: { status: string; vencimento: Date }) {
  if (cobranca.status === "PAGO") {
    return { label: "Pago", variant: "secondary" as const };
  }
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (cobranca.vencimento < hoje) {
    return { label: "Atrasado", variant: "destructive" as const };
  }
  return { label: "Pendente", variant: "outline" as const };
}

export function PacienteCobrancasList({
  pacienteId,
  cobrancas,
}: {
  pacienteId: string;
  cobrancas: Cobranca[];
}) {
  if (cobrancas.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma cobrança registrada para este paciente ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {cobrancas.map((cobranca) => {
        const status = statusCobranca(cobranca);
        return (
          <Card key={cobranca.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">
                    {cobranca.planoNome} · {formatarMoeda(cobranca.valor)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vence em {formatarData(cobranca.vencimento)}
                    {cobranca.pagoEm
                      ? ` · pago em ${formatarData(cobranca.pagoEm)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {cobranca.numeroParcela && cobranca.totalParcelas && (
                    <Badge variant="outline">
                      Parcela {cobranca.numeroParcela}/{cobranca.totalParcelas}
                    </Badge>
                  )}
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </div>
              <div className="flex justify-end">
                <CobrancaRowActions
                  id={cobranca.id}
                  pacienteId={pacienteId}
                  pago={cobranca.status === "PAGO"}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
