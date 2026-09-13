import Link from "next/link";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPlanosRenovaveis } from "@/actions/plano-atribuicoes";
import { periodicidadePlanoLabels } from "@/lib/validations/plano";
import { formatarData } from "@/lib/format";
import { RenovarPlanoDialog } from "@/components/planos/renovar-plano-dialog";

export async function RenovacoesList() {
  const planos = await listPlanosRenovaveis();

  if (planos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="size-6 text-muted-foreground/60" />
          Nenhum plano para renovar no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {planos.length} plano{planos.length !== 1 ? "s" : ""} com todo o período
        cumprido — atendimentos executados e pagamentos em dia.
      </p>

      {planos.map((p) => (
        <Card key={p.id}>
          <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/pacientes/${p.pacienteId}?tab=planos`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {p.pacienteNome}
                </Link>
                <Badge variant="secondary">
                  {periodicidadePlanoLabels[p.periodicidade]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.planoNome}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="size-3.5" />
                {p.total != null
                  ? `${p.realizados}/${p.total} atendimentos executados`
                  : `${p.realizados} atendimentos executados`}{" "}
                · {p.cobrancasPagas} parcela{p.cobrancasPagas !== 1 ? "s" : ""} paga
                {p.cobrancasPagas !== 1 ? "s" : ""} · início em{" "}
                {formatarData(p.dataInicio)}
              </p>
            </div>

            {p.temPlano ? (
              <RenovarPlanoDialog
                atribuicaoId={p.id}
                pacienteNome={p.pacienteNome}
                planoNome={p.planoNome}
                maxParcelas={p.maxParcelas}
              />
            ) : (
              <p className="text-xs text-destructive">
                Plano removido do catálogo
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
