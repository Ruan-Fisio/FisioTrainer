import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PACIENTE_ATIVO } from "@/lib/paciente-exclusao";
import { prisma } from "@/lib/prisma";

/** Vale para todas as telas do paciente: excluído só aparece em Pacientes → Excluídos. */
export default async function PacienteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paciente = await prisma.paciente.findFirst({
    where: { id, ...PACIENTE_ATIVO },
    select: { id: true },
  });
  if (!paciente) notFound();
  return children;
}
