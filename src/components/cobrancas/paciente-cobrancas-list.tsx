import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CobrancaRowActions } from "@/components/cobrancas/cobranca-row-actions";
import { formatarData, formatarMoeda } from "@/lib/format";
import { montarMensagemCobranca } from "@/lib/whatsapp";
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

function CobrancaCard({
  cobranca,
  pacienteId,
  pacienteNome,
  pacienteContato,
  cnpjPix,
  somenteLeitura,
}: {
  cobranca: Cobranca;
  pacienteId: string;
  pacienteNome: string;
  pacienteContato: string | null;
  cnpjPix?: string | null;
  somenteLeitura?: boolean;
}) {
  const status = statusCobranca(cobranca);
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              {cobranca.planoNome} · {formatarMoeda(cobranca.valor)}
              {cobranca.notaFiscal ? " · NF inclusa" : ""}
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
        {somenteLeitura ? null : (
        <div className="flex justify-end">
          <CobrancaRowActions
            id={cobranca.id}
            pacienteId={pacienteId}
            pago={cobranca.status === "PAGO"}
            mensagemCobranca={montarMensagemCobranca({
              pacienteNome,
              planoNome: cobranca.planoNome,
              valor: cobranca.valor,
              vencimento: cobranca.vencimento,
              numeroParcela: cobranca.numeroParcela,
              totalParcelas: cobranca.totalParcelas,
              cnpjPix,
            })}
            telefonePaciente={pacienteContato}
          />
        </div>
        )}
      </CardContent>
    </Card>
  );
}

function GrupoCobrancas({
  titulo,
  subtitulo,
  statusBadge,
  cobrancas,
  ...cardProps
}: {
  titulo: string;
  subtitulo?: string;
  statusBadge?: string;
  cobrancas: Cobranca[];
  pacienteId: string;
  pacienteNome: string;
  pacienteContato: string | null;
  cnpjPix?: string | null;
  somenteLeitura?: boolean;
}) {
  const pagas = cobrancas.filter((c) => c.status === "PAGO").length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{titulo}</h3>
            {statusBadge && (
              <Badge
                variant={statusBadge === "ATIVO" ? "secondary" : "outline"}
              >
                {statusAtribuicaoLabels[statusBadge] ?? statusBadge}
              </Badge>
            )}
          </div>
          {subtitulo && (
            <p className="text-xs text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {pagas}/{cobrancas.length} pagas
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {cobrancas.map((cobranca) => (
          <CobrancaCard key={cobranca.id} cobranca={cobranca} {...cardProps} />
        ))}
      </div>
    </div>
  );
}

export function PacienteCobrancasList({
  pacienteId,
  pacienteNome,
  pacienteContato,
  cobrancas,
  atribuicoes = [],
  cnpjPix,
  somenteLeitura,
}: {
  pacienteId: string;
  pacienteNome: string;
  pacienteContato: string | null;
  cobrancas: Cobranca[];
  atribuicoes?: Atribuicao[];
  cnpjPix?: string | null;
  somenteLeitura?: boolean;
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

  const cardProps = {
    pacienteId,
    pacienteNome,
    pacienteContato,
    cnpjPix,
    somenteLeitura,
  };

  const grupos = atribuicoes
    .map((a) => ({
      atribuicao: a,
      cobrancas: cobrancas.filter((c) => c.planoAtribuicaoId === a.id),
    }))
    .filter((g) => g.cobrancas.length > 0);

  const avulsas = cobrancas.filter((c) => !c.planoAtribuicaoId);

  return (
    <div className="flex flex-col gap-6">
      {grupos.map(({ atribuicao, cobrancas }) => (
        <GrupoCobrancas
          key={atribuicao.id}
          titulo={atribuicao.planoNome}
          subtitulo={`${formaPagamentoPlanoLabels[atribuicao.formaPagamento]} · ${periodicidadePlanoLabels[atribuicao.periodicidade]} · ${formatarMoeda(atribuicao.valor)} em ${atribuicao.numeroParcelas}x`}
          statusBadge={atribuicao.status}
          cobrancas={cobrancas}
          {...cardProps}
        />
      ))}

      {avulsas.length > 0 && (
        <GrupoCobrancas
          titulo="Cobranças avulsas"
          cobrancas={avulsas}
          {...cardProps}
        />
      )}
    </div>
  );
}
