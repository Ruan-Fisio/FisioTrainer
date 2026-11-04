"use client";

import { useTransition } from "react";
import Link from "next/link";
import { FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gerarContratoDoPlano } from "@/actions/contratos";
import { ContratoAcoes } from "@/components/contratos/contrato-acoes";
import { ContratoStatusBadge } from "@/components/contratos/contrato-status-badge";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/format";
import type { StatusContrato } from "@/generated/prisma/client";

export type PacienteDoContrato = {
  nome: string;
  contato: string | null;
  cpf: string | null;
};

/** Linha de contrato no card do plano, na tela do paciente e no portal. */
export function ContratoDoPlano({
  contrato,
  planoAtribuicaoId,
  planoNome,
  planoAtivo,
  pacienteId,
  paciente,
}: {
  contrato: {
    id: string;
    numero: number;
    token: string;
    status: StatusContrato;
    assinadoEm: Date | null;
  } | null;
  planoAtribuicaoId: string;
  planoNome: string;
  planoAtivo: boolean;
  pacienteId: string;
  /** Ausente no portal, onde só existe o link para o próprio paciente. */
  paciente?: PacienteDoContrato;
}) {
  const [gerando, startGerar] = useTransition();

  if (!contrato) {
    if (!paciente || !planoAtivo) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-sm text-muted-foreground">Este plano ainda não tem contrato.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={gerando}
          onClick={() =>
            startGerar(async () => {
              try {
                await gerarContratoDoPlano(planoAtribuicaoId, pacienteId);
                toast.success("Contrato gerado.");
              } catch {
                toast.error("Não foi possível gerar o contrato.");
              }
            })
          }
        >
          {gerando ? <Loader2 className="animate-spin" /> : <FileSignature />}
          Gerar contrato
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <FileSignature className="size-4 text-muted-foreground" aria-hidden />
          <span>Contrato</span>
          <ContratoStatusBadge status={contrato.status} />
          {contrato.assinadoEm && (
            <span className="text-xs text-muted-foreground">
              em {formatarData(contrato.assinadoEm)}
            </span>
          )}
        </div>
        {paciente ? (
          <ContratoAcoes contrato={contrato} paciente={paciente} planoNome={planoNome} />
        ) : (
          <Button asChild size="sm" variant={contrato.status === "PENDENTE" ? "default" : "outline"}>
            <Link href={`/compartilhado/contrato/${contrato.token}`}>
              {contrato.status === "PENDENTE" ? "Assinar contrato" : "Ver contrato"}
            </Link>
          </Button>
        )}
      </div>
      {paciente && contrato.status === "PENDENTE" && !paciente.cpf?.trim() && (
        <p className="text-xs text-destructive">
          Cadastre o CPF do paciente: sem ele, o contrato não pode ser assinado.
        </p>
      )}
    </div>
  );
}
