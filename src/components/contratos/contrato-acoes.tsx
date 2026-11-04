"use client";

import { Copy, FileDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { montarLinkWhatsapp, normalizarTelefoneBr } from "@/lib/whatsapp";

function urlAssinatura(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
  return `${base}/compartilhado/contrato/${token}`;
}

/** Ações da equipe: enviar o link enquanto está pendente, abrir o PDF depois de assinado. */
export function ContratoAcoes({
  contrato,
  paciente,
  planoNome,
}: {
  contrato: { id: string; token: string; status: string };
  paciente: { nome: string; contato: string | null };
  planoNome: string;
}) {
  if (contrato.status === "ASSINADO") {
    return (
      <Button asChild variant="outline" size="sm">
        <a href={`/api/contratos/${contrato.id}/pdf`} target="_blank" rel="noreferrer">
          <FileDown />
          Ver PDF
        </a>
      </Button>
    );
  }
  if (contrato.status !== "PENDENTE") return null;

  function copiar() {
    navigator.clipboard
      .writeText(urlAssinatura(contrato.token))
      .then(() => toast.success("Link de assinatura copiado."))
      .catch(() => toast.error("Não foi possível copiar o link."));
  }

  function enviarWhatsapp() {
    const link = montarLinkWhatsapp(
      paciente.contato,
      `Olá, ${paciente.nome}! Segue o link para assinar o contrato do seu plano ${planoNome}. Para abrir, você vai confirmar seu CPF:\n${urlAssinatura(contrato.token)}`,
    );
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copiar}>
        <Copy />
        Copiar link
      </Button>
      {normalizarTelefoneBr(paciente.contato) && (
        <Button type="button" variant="outline" size="sm" onClick={enviarWhatsapp}>
          <MessageCircle />
          WhatsApp
        </Button>
      )}
    </div>
  );
}
