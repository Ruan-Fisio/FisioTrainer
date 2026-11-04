"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import {
  assinarContrato,
  liberarContrato,
  type ContratoLiberado,
} from "@/actions/portal-contratos";
import { AssinaturaPad } from "@/components/contratos/assinatura-pad";
import { ContratoTexto } from "@/components/contratos/contrato-texto";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mascararCpf } from "@/lib/cpf";

function BaixarPdf({ url, nome }: { url: string; nome: string }) {
  return (
    <Button asChild>
      <a href={url} download={nome}>
        <Download />
        Baixar contrato em PDF
      </a>
    </Button>
  );
}

export function AssinarContratoFluxo({
  token,
  primeiroNome,
  planoNome,
  numero,
}: {
  token: string;
  primeiroNome: string;
  planoNome: string;
  numero: string;
}) {
  const [cpf, setCpf] = useState("");
  const [contrato, setContrato] = useState<ContratoLiberado | null>(null);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startEnvio] = useTransition();
  const rotuloAssinaturaId = useId();
  const nomePdf = `Contrato_${numero}.pdf`;

  function confirmarCpf(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    startEnvio(async () => {
      const r = await liberarContrato(token, cpf);
      if (r.ok) setContrato(r.dados);
      else setErro(r.error);
    });
  }

  function assinar(e: FormEvent) {
    e.preventDefault();
    if (contrato?.status !== "PENDENTE" || !assinatura || !aceite) return;
    const { conteudo, conteudoHash } = contrato;
    setErro(null);
    startEnvio(async () => {
      const r = await assinarContrato(token, { cpf, conteudoHash, assinatura, aceite });
      if (r.ok) setContrato({ status: "ASSINADO", conteudo, ...r.dados });
      else setErro(r.error);
    });
  }

  if (!contrato) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold">Olá, {primeiroNome}!</h1>
            <p className="text-sm text-muted-foreground">
              Este é o contrato {numero} do plano {planoNome}. Para abrir, confirme seu CPF.
            </p>
          </div>
          <form onSubmit={confirmarCpf} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(mascararCpf(e.target.value))}
              />
            </div>
            {erro && (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={enviando || cpf.length < 14}>
                {enviando && <Loader2 className="animate-spin" />}
                Abrir contrato
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (contrato.status === "ASSINADO") {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="size-10 text-emerald-600" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold">Contrato assinado</h1>
              <p className="text-sm text-muted-foreground">
                Assinado em {contrato.assinadoEm}. A clínica também fica com uma cópia.
              </p>
            </div>
            <BaixarPdf url={contrato.pdfUrl} nome={nomePdf} />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <ContratoTexto conteudo={contrato.conteudo} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <ContratoTexto conteudo={contrato.conteudo} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <form onSubmit={assinar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label id={rotuloAssinaturaId}>Desenhe sua assinatura</Label>
              <AssinaturaPad rotuloId={rotuloAssinaturaId} onChange={setAssinatura} />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="aceite"
                className="mt-0.5"
                checked={aceite}
                onCheckedChange={(v) => setAceite(v === true)}
              />
              <Label htmlFor="aceite" className="font-normal leading-snug">
                Li o contrato, concordo com os termos e reconheço esta assinatura eletrônica
                como válida.
              </Label>
            </div>

            {erro && (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={enviando || !assinatura || !aceite}>
                {enviando && <Loader2 className="animate-spin" />}
                Assinar contrato
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
