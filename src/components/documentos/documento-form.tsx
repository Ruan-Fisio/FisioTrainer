"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormActions } from "@/components/ui/form-actions";
import { cn } from "@/lib/utils";
import {
  tipoDocumento,
  type CampoDocumento,
  type ValoresDocumento,
} from "@/lib/documentos-catalogo";
import type { DocumentoActionState } from "@/actions/documentos-paciente";

const initialState: DocumentoActionState = {};

function CampoTexto({ campo, valor }: { campo: CampoDocumento; valor: string }) {
  const [texto, setTexto] = useState(valor);
  const id = `doc-${campo.nome}`;
  const ajudaId = campo.ajuda ? `${id}-ajuda` : undefined;
  const longo = campo.tipo === "textarea";
  return (
    <div className={cn("flex flex-col gap-2", campo.largo && "sm:col-span-2")}>
      <Label htmlFor={id}>{campo.label}</Label>
      {campo.ajuda && (
        <p id={ajudaId} className="-mt-1 text-xs text-muted-foreground">
          {campo.ajuda}
        </p>
      )}
      {longo ? (
        <Textarea
          id={id}
          name={campo.nome}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={campo.max}
          rows={Math.min(6, Math.max(3, Math.ceil((campo.max ?? 180) / 80)))}
          aria-describedby={ajudaId}
        />
      ) : (
        <Input
          id={id}
          name={campo.nome}
          type={campo.tipo === "data" ? "date" : campo.tipo === "hora" ? "time" : "text"}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={campo.tipo === "texto" ? campo.max : undefined}
          aria-describedby={ajudaId}
        />
      )}
      {longo && campo.max && (
        <p
          className={cn(
            "self-end text-xs tabular-nums text-muted-foreground",
            texto.length >= campo.max && "text-destructive",
          )}
          aria-live="polite"
        >
          {texto.length}/{campo.max}
        </p>
      )}
    </div>
  );
}

function CampoCheckbox({ campo, marcado }: { campo: CampoDocumento; marcado: boolean }) {
  const id = `doc-${campo.nome}`;
  return (
    <div className="flex items-start gap-2 sm:col-span-2">
      <Checkbox id={id} name={campo.nome} defaultChecked={marcado} className="mt-0.5" />
      <Label htmlFor={id} className="font-normal leading-snug">
        {campo.label}
      </Label>
    </div>
  );
}

/**
 * Formulário genérico de um documento do catálogo: uma seção do PDF por card, cada
 * campo com o mesmo limite de caracteres do PDF.
 */
export function DocumentoForm({
  tipoSlug,
  pacienteId,
  valores,
  action,
  mode,
}: {
  tipoSlug: string;
  pacienteId: string;
  valores: ValoresDocumento;
  action: (prev: DocumentoActionState, formData: FormData) => Promise<DocumentoActionState>;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialState);
  const tipo = tipoDocumento(tipoSlug)!;
  const voltar = `/pacientes/${pacienteId}?tab=documentos`;

  useEffect(() => {
    if (state.success && state.id) {
      const pdf = `/api/documentos/${state.id}/pdf`;
      toast.success(mode === "create" ? "Documento emitido." : "Documento atualizado.", {
        action: { label: "Abrir PDF", onClick: () => window.open(pdf, "_blank", "noopener") },
      });
      router.push(voltar);
    }
  }, [state.success, state.id, mode, router, voltar]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4 pb-24">
      {tipo.secoes.map((secao) => (
        <Card key={secao.titulo}>
          <CardHeader>
            <CardTitle className="text-base">{secao.titulo}</CardTitle>
            {secao.descricao && <CardDescription>{secao.descricao}</CardDescription>}
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {secao.campos.map((campo) =>
              campo.tipo === "checkbox" ? (
                <CampoCheckbox key={campo.nome} campo={campo} marcado={valores[campo.nome] === true} />
              ) : (
                <CampoTexto
                  key={campo.nome}
                  campo={campo}
                  valor={typeof valores[campo.nome] === "string" ? (valores[campo.nome] as string) : ""}
                />
              ),
            )}
          </CardContent>
        </Card>
      ))}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <FormActions
        submitLabel={mode === "create" ? "Emitir documento" : "Salvar alterações"}
        onCancel={() => router.push(voltar)}
      />
    </form>
  );
}
