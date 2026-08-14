"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Ações de salvar/cancelar de um formulário: no mobile, botão circular
 * flutuante (FAB) para salvar; no desktop, barra fixa horizontal no rodapé.
 */
export function FormActions({
  submitLabel,
  cancelLabel = "Cancelar",
  onCancel,
}: {
  submitLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      {/* Mobile: cancelar inline + botão flutuante para salvar */}
      <div className="flex justify-end md:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          {cancelLabel}
        </Button>
      </div>
      <button
        type="submit"
        disabled={pending}
        aria-label={submitLabel}
        title={submitLabel}
        className="fixed right-5 bottom-5 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-foreground/10 transition-all hover:bg-primary/80 active:translate-y-px disabled:pointer-events-none disabled:opacity-70 md:hidden"
      >
        {pending ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <Save className="size-6" />
        )}
        <span className="sr-only">{submitLabel}</span>
      </button>

      {/* Desktop: barra fixa horizontal no rodapé */}
      <div className="fixed inset-x-0 bottom-0 z-30 hidden justify-end gap-3 border-t bg-background/95 px-8 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur-sm md:left-64 md:flex">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </>
  );
}
