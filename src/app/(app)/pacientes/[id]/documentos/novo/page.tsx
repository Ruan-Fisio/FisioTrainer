import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { PACIENTE_ATIVO } from "@/lib/paciente-exclusao";
import { Card } from "@/components/ui/card";
import {
  CATEGORIAS_DOCUMENTO,
  TIPOS_DOCUMENTO,
  tipoDocumento,
} from "@/lib/documentos-catalogo";
import { valoresParaNovoDocumento } from "@/lib/documentos-paciente";
import { criarDocumento } from "@/actions/documentos-paciente";
import { DocumentoForm } from "@/components/documentos/documento-form";
import { AvisoSemAssinatura } from "@/components/documentos/aviso-sem-assinatura";

export default async function NovoDocumentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  await exigirSessao();
  const { id } = await params;
  const { tipo: tipoSlug } = await searchParams;

  const paciente = await prisma.paciente.findFirst({
    where: { id, ...PACIENTE_ATIVO },
    select: { nome: true },
  });
  if (!paciente) notFound();

  const tipo = tipoSlug ? tipoDocumento(tipoSlug) : undefined;

  if (!tipo) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Novo documento</h1>
          <p className="text-sm text-muted-foreground">
            Escolha o modelo para {paciente.nome}. Os dados do paciente já vêm preenchidos.
          </p>
        </div>
        <AvisoSemAssinatura />
        {CATEGORIAS_DOCUMENTO.map((categoria) => (
          <section key={categoria} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{categoria}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TIPOS_DOCUMENTO.filter((t) => t.categoria === categoria).map((t) => (
                <Card key={t.slug} className="p-0">
                  <Link
                    href={`/pacientes/${id}/documentos/novo?tipo=${t.slug}`}
                    className="group flex h-full items-center justify-between gap-2 p-4 transition-colors hover:bg-primary/5"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">{t.titulo}</p>
                      <p className="text-xs text-muted-foreground">{t.descricao}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const valores = await valoresParaNovoDocumento(id, tipo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{tipo.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {paciente.nome} · {tipo.descricao}{" "}
          <Link href={`/pacientes/${id}/documentos/novo`} className="text-primary hover:underline">
            Trocar modelo
          </Link>
        </p>
      </div>
      {tipo.assinaturas.length > 0 && <AvisoSemAssinatura />}
      <DocumentoForm
        tipoSlug={tipo.slug}
        pacienteId={id}
        valores={valores}
        action={criarDocumento.bind(null, id, tipo.slug)}
        mode="create"
      />
    </div>
  );
}
