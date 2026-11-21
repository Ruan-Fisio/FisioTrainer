import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateUsuario } from "@/actions/usuarios";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { AssinaturaCard } from "@/components/usuarios/assinatura-card";
import { exigirSessao } from "@/lib/sessao";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await exigirSessao();
  // A assinatura só é vista e alterada pelo próprio usuário.
  const ehOProprio = sessao.id === id;

  const usuario = await prisma.user.findUnique({
    where: { id },
    select: {
      name: true,
      email: true,
      cref: true,
      crefito: true,
      cpfCnpj: true,
      razaoSocial: true,
      inscricaoMunicipal: true,
      telefone: true,
      endereco: true,
      atendeFisioterapia: true,
      atendeEducacaoFisica: true,
      assinaturaAtual: ehOProprio ? { select: { id: true, png: true } } : false,
    },
  });

  if (!usuario) notFound();
  const { assinaturaAtual, ...dadosUsuario } = usuario;
  const assinaturaDataUrl = assinaturaAtual
    ? `data:image/png;base64,${Buffer.from(assinaturaAtual.png).toString("base64")}`
    : null;

  const updateUsuarioWithId = updateUsuario.bind(null, id);

  return (
    // pb-24: a barra fixa de salvar do formulário não pode cobrir os botões do card.
    <div className={ehOProprio ? "flex flex-col gap-6 pb-24" : "flex flex-col gap-6"}>
      <div>
        <h1 className="text-2xl font-semibold">Editar usuário</h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados de {usuario.name}.
        </p>
      </div>
      <UsuarioForm
        action={updateUsuarioWithId}
        defaultValues={dadosUsuario}
        mode="edit"
      />
      {ehOProprio && (
        <AssinaturaCard key={assinaturaAtual?.id ?? "sem-assinatura"} atual={assinaturaDataUrl} />
      )}
    </div>
  );
}
