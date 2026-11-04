import { Badge } from "@/components/ui/badge";
import type { StatusContrato } from "@/generated/prisma/client";

export const STATUS_CONTRATO_LABEL: Record<StatusContrato, string> = {
  PENDENTE: "Aguardando assinatura",
  ASSINADO: "Assinado",
  SUBSTITUIDO: "Substituído",
  CANCELADO: "Cancelado",
};

export function ContratoStatusBadge({ status }: { status: StatusContrato }) {
  return (
    <Badge variant={status === "ASSINADO" ? "default" : status === "PENDENTE" ? "secondary" : "outline"}>
      {STATUS_CONTRATO_LABEL[status]}
    </Badge>
  );
}
