import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Abre o PDF só desta execução (Avaliação ou Retorno) para imprimir. */
export function ImprimirExecucaoButton({ execucaoId }: { execucaoId: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a
        href={`/api/execucoes/${execucaoId}/relatorio-individual`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Printer />
        Imprimir
      </a>
    </Button>
  );
}
