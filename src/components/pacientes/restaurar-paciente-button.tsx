"use client";

import { useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { restaurarPaciente } from "@/actions/pacientes";
import { Button } from "@/components/ui/button";

export function RestaurarPacienteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await restaurarPaciente(id);
            toast.success("Paciente restaurado.");
          } catch {
            toast.error("Não foi possível restaurar o paciente.");
          }
        })
      }
    >
      {isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
      Restaurar
    </Button>
  );
}
