import { blocosContrato } from "@/lib/contrato-modelo";

/** Texto do contrato na tela, com a mesma divisão em blocos usada no PDF. */
export function ContratoTexto({ conteudo }: { conteudo: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      {blocosContrato(conteudo).map((bloco, i) => {
        if (bloco.tipo === "titulo") {
          return (
            <h2 key={i} className="text-center text-lg font-semibold text-primary">
              {bloco.texto}
            </h2>
          );
        }
        if (bloco.tipo === "secao") {
          return (
            <h3 key={i} className="mt-2 font-semibold">
              {bloco.texto}
            </h3>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {bloco.texto}
          </p>
        );
      })}
    </div>
  );
}
