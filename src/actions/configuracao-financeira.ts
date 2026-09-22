"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { configuracaoTaxaSchema } from "@/lib/validations/configuracao-financeira";
import {
  CHAVE_TAXA_PARCELAMENTO_CARTAO,
  TAXA_PARCELAMENTO_CARTAO_PADRAO,
} from "@/lib/configuracao-financeira";

export async function listConfiguracoesTaxa() {
  const taxas = await prisma.configuracaoTaxa.findMany({ orderBy: { nome: "asc" } });
  return taxas.map((t) => ({ ...t, percentual: Number(t.percentual) }));
}

/** Percentual atual da taxa de parcelamento no cartão de um Plano. */
export async function getTaxaParcelamentoCartao(): Promise<number> {
  const taxa = await prisma.configuracaoTaxa.findUnique({
    where: { chave: CHAVE_TAXA_PARCELAMENTO_CARTAO },
  });
  return taxa ? Number(taxa.percentual) : TAXA_PARCELAMENTO_CARTAO_PADRAO;
}

export type ConfiguracaoTaxaActionState = {
  error?: string;
  success?: boolean;
};

export async function updateConfiguracaoTaxa(
  id: string,
  _prevState: ConfiguracaoTaxaActionState,
  formData: FormData,
): Promise<ConfiguracaoTaxaActionState> {
  const parsed = configuracaoTaxaSchema.safeParse({
    percentual: formData.get("percentual"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.configuracaoTaxa.update({
    where: { id },
    data: { percentual: parsed.data.percentual },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}
