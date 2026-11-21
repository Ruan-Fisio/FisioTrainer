import Link from "next/link";
import { Signature } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";

/**
 * Aviso para quem emite documentos sem ter assinatura cadastrada (os PDFs saem sem
 * assinatura). Server component: some sozinho quando o usuário logado já tem uma.
 */
export async function AvisoSemAssinatura() {
  const usuario = await exigirSessao();
  const dados = await prisma.user.findUnique({
    where: { id: usuario.id },
    select: { assinaturaAtualId: true },
  });
  if (dados?.assinaturaAtualId) return null;

  return (
    <div
      data-testid="aviso-sem-assinatura"
      className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2">
        <Signature className="mt-0.5 size-4 shrink-0 text-primary" />
        Você ainda não cadastrou sua assinatura: os documentos que emitir sairão sem ela.
      </p>
      <Link
        href={`/usuarios/${usuario.id}`}
        className="shrink-0 font-medium text-primary hover:underline"
      >
        Cadastrar minha assinatura
      </Link>
    </div>
  );
}
