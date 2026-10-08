"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  criarPreCadastro,
  type PreCadastroActionState,
} from "@/actions/pre-cadastros";
import { ArquivosUpload } from "@/components/pre-cadastro/arquivos-upload";
import { LIMITE_PALAVRAS_QUEIXA } from "@/lib/validations/pre-cadastro";
import { mascararCelular } from "@/lib/telefone";
import { contarPalavras } from "@/lib/texto";

const initialState: PreCadastroActionState = {};

export function PreCadastroForm() {
  const [state, formAction, pending] = useActionState(
    criarPreCadastro,
    initialState,
  );
  const [celular, setCelular] = useState("");
  const [queixa, setQueixa] = useState("");
  // Id da sessão de upload: define a pasta temporária dos anexos no R2.
  const [sessaoId] = useState(() => crypto.randomUUID());
  const [enviandoArquivos, setEnviandoArquivos] = useState(false);
  const palavras = contarPalavras(queixa);
  const excedeu = palavras > LIMITE_PALAVRAS_QUEIXA;

  if (state.success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="size-12 text-primary" />
          <h2 className="text-xl font-semibold">Recebemos seus dados!</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Nossa equipe vai analisar as informações e entrar em contato pelo
            celular informado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Vamos nos conhecer</CardTitle>
        <CardDescription>
          Preencha os dados abaixo e entraremos em contato para agendar seu
          atendimento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                autoComplete="given-name"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sobrenome">Sobrenome</Label>
              <Input
                id="sobrenome"
                name="sobrenome"
                autoComplete="family-name"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="celular">Celular de contato (com DDD)</Label>
            <Input
              id="celular"
              name="celular"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 91234-5678"
              value={celular}
              onChange={(e) => setCelular(mascararCelular(e.target.value))}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="queixaPrincipal">Queixa principal</Label>
            <Textarea
              id="queixaPrincipal"
              name="queixaPrincipal"
              rows={6}
              placeholder="Conte o que você está sentindo, há quanto tempo e o que gostaria de melhorar."
              value={queixa}
              onChange={(e) => setQueixa(e.target.value)}
              aria-invalid={excedeu || undefined}
              required
            />
            <p
              className={`text-right text-xs ${
                excedeu ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {palavras} / {LIMITE_PALAVRAS_QUEIXA} palavras
            </p>
          </div>

          <ArquivosUpload
            sessaoId={sessaoId}
            onEnviandoChange={setEnviandoArquivos}
          />

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || excedeu || enviandoArquivos}>
              {(pending || enviandoArquivos) && (
                <Loader2 className="animate-spin" />
              )}
              {enviandoArquivos ? "Enviando arquivos..." : "Enviar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
