import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvolucaoDetailActions } from "@/components/evolucoes/evolucao-detail-actions";

const TEXT_FIELDS: { key: "hdp" | "hda" | "evolucao" | "conduta"; label: string }[] = [
  { key: "hdp", label: "HDP (Histórico da Doença Pregressa)" },
  { key: "hda", label: "HDA (Histórico da Doença Atual)" },
];

const VITAL_FIELDS: { key: "pa" | "fc" | "spo2" | "fr" | "temperatura"; label: string }[] = [
  { key: "pa", label: "PA" },
  { key: "fc", label: "FC" },
  { key: "spo2", label: "SpO2" },
  { key: "fr", label: "FR" },
  { key: "temperatura", label: "Temperatura" },
];

const EVOLUCAO_FIELDS: { key: "evolucao" | "conduta"; label: string }[] = [
  { key: "evolucao", label: "Evolução" },
  { key: "conduta", label: "Conduta" },
];

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export default async function VisualizarEvolucaoPage({
  params,
}: {
  params: Promise<{ id: string; evolucaoId: string }>;
}) {
  const { id, evolucaoId } = await params;

  const evolucao = await prisma.evolucao.findUnique({
    where: { id: evolucaoId },
    include: {
      paciente: { select: { id: true, nome: true } },
      profissional: { select: { id: true, name: true } },
    },
  });

  if (!evolucao || evolucao.pacienteId !== id) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Evolução de {evolucao.paciente.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatarData(evolucao.data)} · {evolucao.profissional.name}
          </p>
        </div>
        <EvolucaoDetailActions id={evolucaoId} pacienteId={id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ficha de evolução</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {TEXT_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="text-sm whitespace-pre-wrap">{evolucao[key]}</p>
            </div>
          ))}

          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">
              Sinais Vitais
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {VITAL_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm">{evolucao[key]}</p>
                </div>
              ))}
            </div>
          </div>

          {EVOLUCAO_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <p className="text-sm whitespace-pre-wrap">{evolucao[key]}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
