import { z } from "zod";

/** Imagem já enviada à área temporária, a ser vinculada ao salvar o exame. */
export const imagemNovaSchema = z.object({
  chave: z.string().min(1).max(500),
  colunaId: z.string().min(1).max(100),
  linha: z.number().int().min(0).max(1000),
  nomeOriginal: z.string().max(300),
});

export const imagensFormSchema = z.object({
  imagens: z.array(imagemNovaSchema).max(500),
  removidas: z.array(z.string().min(1).max(100)).max(500),
});

export type ImagemNova = z.infer<typeof imagemNovaSchema>;

/** Lê os campos `imagens` e `imagensRemovidas` do FormData (JSON); inválido → vazio. */
export function parseImagensForm(formData: FormData) {
  const ler = (nome: string) => {
    try {
      const raw = formData.get(nome);
      return raw ? JSON.parse(String(raw)) : [];
    } catch {
      return [];
    }
  };
  const parsed = imagensFormSchema.safeParse({
    imagens: ler("imagens"),
    removidas: ler("imagensRemovidas"),
  });
  return parsed.success ? parsed.data : { imagens: [], removidas: [] };
}
