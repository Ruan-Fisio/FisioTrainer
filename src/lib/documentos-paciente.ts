import { prisma } from "@/lib/prisma";
import {
  resumoDocumento,
  tipoDocumento,
  type TipoDocumento,
  type ValoresDocumento,
} from "@/lib/documentos-catalogo";
import {
  extrairLembrados,
  nomeArquivoDocumento,
  valoresIniciais,
} from "@/lib/documentos-valores";
import { preencherDocumento } from "@/lib/documentos-pdf";

/**
 * Leituras de documentos do paciente usadas pela clínica (via actions com sessão), pelo
 * portal (paciente já resolvido pelo token) e pelas rotas de PDF. Sem checagem de acesso
 * aqui: quem chama confere sessão ou token.
 */

export function valoresDoBanco(json: unknown): ValoresDocumento {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: ValoresDocumento = {};
  for (const [k, v] of Object.entries(json)) {
    if (typeof v === "string" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

export type DocumentoListado = {
  id: string;
  tipo: string;
  titulo: string;
  resumo: string | null;
  autor: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listarDocumentosDoPaciente(pacienteId: string): Promise<DocumentoListado[]> {
  const docs = await prisma.documentoPaciente.findMany({
    where: { pacienteId },
    orderBy: { createdAt: "desc" },
    include: { autor: { select: { name: true } } },
  });
  return docs.map((doc) => {
    const tipo = tipoDocumento(doc.tipo);
    return {
      id: doc.id,
      tipo: doc.tipo,
      titulo: tipo?.titulo ?? "Documento",
      resumo: tipo ? resumoDocumento(tipo, valoresDoBanco(doc.valores)) : null,
      autor: doc.autor?.name ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  });
}

/** Valores iniciais de um documento novo, com os dados do profissional do último emitido. */
export async function valoresParaNovoDocumento(pacienteId: string, tipo: TipoDocumento) {
  const [paciente, recentes] = await Promise.all([
    prisma.paciente.findUniqueOrThrow({
      where: { id: pacienteId },
      select: { nome: true, dataNascimento: true, cpf: true },
    }),
    prisma.documentoPaciente.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { tipo: true, valores: true },
    }),
  ]);
  const lembrados = extrairLembrados(
    recentes.map((d) => ({ tipo: tipoDocumento(d.tipo), valores: valoresDoBanco(d.valores) })),
  );
  return valoresIniciais(tipo, paciente, lembrados);
}

/** PDF preenchido de um documento, ou null se não existe / não é do paciente informado. */
export async function gerarPdfDocumento(id: string, pacienteId?: string) {
  const doc = await prisma.documentoPaciente.findUnique({
    where: { id },
    include: { paciente: { select: { nome: true } } },
  });
  if (!doc || (pacienteId !== undefined && doc.pacienteId !== pacienteId)) return null;
  const tipo = tipoDocumento(doc.tipo);
  if (!tipo) return null;
  const bytes = await preencherDocumento(tipo, valoresDoBanco(doc.valores));
  return { bytes, nomeArquivo: nomeArquivoDocumento(tipo.titulo, doc.paciente.nome) };
}
