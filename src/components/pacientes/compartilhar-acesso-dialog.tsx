"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getOuCriarAcessoPaciente,
  revogarAcessoPaciente,
} from "@/actions/acessos-compartilhados";

export function CompartilharAcessoDialog({ pacienteId }: { pacienteId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [acessoId, setAcessoId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [carregando, startCarregar] = useTransition();
  const [revogando, startRevogar] = useTransition();

  useEffect(() => {
    if (!open || token) return;
    startCarregar(async () => {
      try {
        const acesso = await getOuCriarAcessoPaciente(pacienteId);
        setToken(acesso.token);
        setAcessoId(acesso.id);
      } catch {
        toast.error("Não foi possível gerar o link de acesso.");
        setOpen(false);
      }
    });
  }, [open, token, pacienteId]);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const url = token ? `${baseUrl}/compartilhado/paciente/${token}` : "";

  function copiar() {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiado(true);
        toast.success("Link copiado.");
        setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => toast.error("Não foi possível copiar o link."));
  }

  function revogarEGerarNovo() {
    if (!acessoId) return;
    startRevogar(async () => {
      try {
        await revogarAcessoPaciente(acessoId);
        const novo = await getOuCriarAcessoPaciente(pacienteId);
        setToken(novo.token);
        setAcessoId(novo.id);
        toast.success("Link anterior revogado. Novo link gerado.");
        router.refresh();
      } catch {
        toast.error("Não foi possível revogar o link.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 />
          Compartilhar acesso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartilhar acesso do paciente</DialogTitle>
          <DialogDescription>
            Qualquer pessoa com este link vê as avaliações, evoluções, treinos,
            planos e o financeiro deste paciente, e pode agendar pelos planos
            ativos. Não exige login.
          </DialogDescription>
        </DialogHeader>

        {carregando || !token ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Gerando link…
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copiar}
              aria-label="Copiar link"
            >
              {copiado ? <Check /> : <Copy />}
            </Button>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={revogarEGerarNovo}
            disabled={!token || revogando}
          >
            {revogando ? "Revogando…" : "Revogar e gerar novo"}
          </Button>
          <Button onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
