import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BaixarPdfButton({
  execucaoId,
  retornoId,
}: {
  execucaoId: string;
  retornoId: string;
}) {
  return (
    <Button asChild variant="outline" size="sm">
      <a
        href={`/api/execucoes/${execucaoId}/relatorio?retornoId=${retornoId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Download />
        Baixar PDF
      </a>
    </Button>
  );
}
