"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({ exercicioId }: { exercicioId: string }) {
  function handleShare() {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const shareUrl = `${baseUrl}/compartilhado/exercicios/${exercicioId}`;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success("Link de compartilhamento copiado.");
      })
      .catch(() => {
        toast.error("Não foi possível copiar o link.");
      });
  }

  return (
    <Button type="button" variant="outline" onClick={handleShare}>
      <Share2 />
      Compartilhar
    </Button>
  );
}
