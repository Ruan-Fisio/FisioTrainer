"use client";

import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copia o link público do formulário de pré-cadastro para a área de transferência. */
export function CopiarLinkButton() {
  async function copiar() {
    const url = `${window.location.origin}/pre-cadastro`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link do pré-cadastro copiado.");
    } catch {
      toast.error("Não foi possível copiar. Link: " + url);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={copiar}>
      <Link2 />
      Copiar link do pré-cadastro
    </Button>
  );
}
