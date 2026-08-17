import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MensalidadeRowActions } from "@/components/mensalidades/mensalidade-row-actions";
import { formatarData, formatarMoeda } from "@/lib/format";
import type { getMensalidadesByPaciente } from "@/actions/mensalidades";

type Mensalidade = Awaited<
  ReturnType<typeof getMensalidadesByPaciente>
>[number];

export function statusMensalidade(mensalidade: {
  status: string;
  vencimento: Date;
}) {
  if (mensalidade.status === "PAGO") {
    return { label: "Pago", variant: "secondary" as const };
  }
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (mensalidade.vencimento < hoje) {
    return { label: "Atrasado", variant: "destructive" as const };
  }
  return { label: "Pendente", variant: "outline" as const };
}

export function MensalidadesList({
  pacienteId,
  mensalidades,
}: {
  pacienteId: string;
  mensalidades: Mensalidade[];
}) {
  if (mensalidades.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma mensalidade registrada para este paciente ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {mensalidades.map((mensalidade) => {
        const status = statusMensalidade(mensalidade);
        return (
          <Card key={mensalidade.id}>
            <CardContent className="flex items-center justify-between gap-2 p-4">
              <div className="flex flex-col gap-1">
                <p className="font-medium">
                  {mensalidade.planoNome} · {formatarMoeda(mensalidade.valor)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vence em {formatarData(mensalidade.vencimento)}
                  {mensalidade.pagoEm
                    ? ` · pago em ${formatarData(mensalidade.pagoEm)}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <MensalidadeRowActions
                  id={mensalidade.id}
                  pacienteId={pacienteId}
                  pago={mensalidade.status === "PAGO"}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
