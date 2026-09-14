import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatarMoeda } from "@/lib/format";
import {
  formaPagamentoPlanoLabels,
  periodicidadePlanoLabels,
} from "@/lib/validations/plano";
import type { getCobrancasByPaciente } from "@/actions/cobrancas";
import type { listPlanoAtribuicoesByPaciente } from "@/actions/plano-atribuicoes";

type Cobranca = Awaited<ReturnType<typeof getCobrancasByPaciente>>[number];
type Atribuicao = Awaited<
  ReturnType<typeof listPlanoAtribuicoesByPaciente>
>[number];

const statusAtribuicaoLabels: Record<string, string> = {
  ATIVO: "Ativo",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
};

export function PlanosFinanceiroPublico({
  token,
  atribuicoes,
  cobrancas,
}: {
  token: string;
  atribuicoes: Atribuicao[];
  cobrancas: Cobranca[];
}) {
  const grupos = atribuicoes
    .map((a) => ({
      atribuicao: a,
      cobrancas: cobrancas.filter((c) => c.planoAtribuicaoId === a.id),
    }))
    .filter((g) => g.cobrancas.length > 0);

  const avulsas = cobrancas.filter((c) => !c.planoAtribuicaoId);

  if (grupos.length === 0 && avulsas.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma cobrança registrada ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {grupos.map(({ atribuicao, cobrancas: cobrancasPlano }) => {
        const pagas = cobrancasPlano.filter((c) => c.status === "PAGO").length;
        return (
          <Card key={atribuicao.id} className="p-0">
            <Link
              href={`/compartilhado/paciente/${token}/financeiro/${atribuicao.id}`}
              className="group flex items-center justify-between gap-2 p-4 transition-colors hover:bg-primary/5"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{atribuicao.planoNome}</p>
                  <Badge
                    variant={
                      atribuicao.status === "ATIVO" ? "secondary" : "outline"
                    }
                  >
                    {statusAtribuicaoLabels[atribuicao.status] ??
                      atribuicao.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formaPagamentoPlanoLabels[atribuicao.formaPagamento]} ·{" "}
                  {periodicidadePlanoLabels[atribuicao.periodicidade]} ·{" "}
                  {formatarMoeda(atribuicao.valor)} em{" "}
                  {atribuicao.numeroParcelas}x
                </p>
                <p className="text-xs text-muted-foreground">
                  {pagas}/{cobrancasPlano.length} pagas
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Card>
        );
      })}

      {avulsas.length > 0 && (
        <Card className="p-0">
          <Link
            href={`/compartilhado/paciente/${token}/financeiro/avulsas`}
            className="group flex items-center justify-between gap-2 p-4 transition-colors hover:bg-primary/5"
          >
            <div className="flex flex-col gap-1">
              <p className="font-medium">Cobranças avulsas</p>
              <p className="text-xs text-muted-foreground">
                {avulsas.filter((c) => c.status === "PAGO").length}/
                {avulsas.length} pagas
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Card>
      )}
    </div>
  );
}
