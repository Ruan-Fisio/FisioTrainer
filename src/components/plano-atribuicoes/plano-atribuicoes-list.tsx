import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PlanoAtribuicaoRowActions } from "@/components/plano-atribuicoes/plano-atribuicao-row-actions";
import { formatarData, formatarMoeda } from "@/lib/format";
import type { listPlanoAtribuicoesByPaciente } from "@/actions/plano-atribuicoes";

type Atribuicao = Awaited<ReturnType<typeof listPlanoAtribuicoesByPaciente>>[number];

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
};

function AtribuicaoCard({
  atribuicao,
  pacienteId,
  showActions,
}: {
  atribuicao: Atribuicao;
  pacienteId: string;
  showActions: boolean;
}) {
  const pagas = atribuicao.cobrancas.filter((m) => m.status === "PAGO").length;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{atribuicao.planoNome}</p>
            <p className="text-sm text-muted-foreground">
              {atribuicao.atendimentos ? `${atribuicao.atendimentos}x atendimentos · ` : ""}
              {formatarMoeda(atribuicao.valor)} em {atribuicao.numeroParcelas}x
              {atribuicao.cartao ? ` · Cartão (+${atribuicao.taxaCartao}%)` : ""}
              {atribuicao.notaFiscal ? " · NF inclusa" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Início em {formatarData(atribuicao.dataInicio)} · {pagas}/
              {atribuicao.cobrancas.length} parcelas pagas
            </p>
            {atribuicao.desconto > 0 && (
              <p className="text-xs text-muted-foreground">
                Valor original {formatarMoeda(atribuicao.valorOriginal)} · Desconto de{" "}
                {formatarMoeda(atribuicao.desconto)} (
                {((atribuicao.desconto / atribuicao.valorOriginal) * 100).toFixed(1)}%) aplicado
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={atribuicao.status === "ATIVO" ? "secondary" : "outline"}>
              {statusLabels[atribuicao.status] ?? atribuicao.status}
            </Badge>
            {showActions && (
              <PlanoAtribuicaoRowActions id={atribuicao.id} pacienteId={pacienteId} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlanoAtribuicoesList({
  atribuicoes,
  pacienteId,
}: {
  atribuicoes: Atribuicao[];
  pacienteId: string;
}) {
  const ativa = atribuicoes.find((a) => a.status === "ATIVO");
  const historico = atribuicoes.filter((a) => a.status !== "ATIVO");

  return (
    <div className="flex flex-col gap-4">
      {ativa ? (
        <AtribuicaoCard atribuicao={ativa} pacienteId={pacienteId} showActions />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum plano atribuído a este paciente no momento.
          </CardContent>
        </Card>
      )}

      {historico.length > 0 && (
        <CollapsibleSection title="Histórico de planos" defaultOpen={false}>
          <div className="flex flex-col gap-3">
            {historico.map((atribuicao) => (
              <AtribuicaoCard
                key={atribuicao.id}
                atribuicao={atribuicao}
                pacienteId={pacienteId}
                showActions={false}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}
