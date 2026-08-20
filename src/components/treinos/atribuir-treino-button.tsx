"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AtribuirTreinoDialog } from "@/components/treinos/atribuir-treino-dialog";
import { ShareButton } from "@/components/treinos/share-button";

export function AtribuirTreinoButton({ pacienteId }: { pacienteId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <ShareButton pacienteId={pacienteId} />
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Atribuir treino
      </Button>
      <AtribuirTreinoDialog
        open={open}
        onOpenChange={setOpen}
        pacienteIdFixo={pacienteId}
      />
    </div>
  );
}
