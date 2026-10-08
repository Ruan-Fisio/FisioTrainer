import { z } from "zod";
import { celularValido, soDigitos } from "@/lib/telefone";
import { contarPalavras } from "@/lib/texto";
import { MAX_ARQUIVOS_PRE_CADASTRO } from "@/lib/storage-keys";

export const LIMITE_PALAVRAS_QUEIXA = 2000;

export const preCadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  sobrenome: z.string().trim().min(2, "Informe o sobrenome."),
  celular: z
    .string()
    .trim()
    .refine(celularValido, "Informe um celular válido com DDD.")
    .transform(soDigitos),
  queixaPrincipal: z
    .string()
    .trim()
    .min(10, "Descreva sua queixa principal.")
    .refine(
      (v) => contarPalavras(v) <= LIMITE_PALAVRAS_QUEIXA,
      `A queixa deve ter no máximo ${LIMITE_PALAVRAS_QUEIXA} palavras.`,
    ),
});

export const rejeitarPreCadastroSchema = z.object({
  motivo: z.string().trim().max(500, "Motivo muito longo (máx. 500).").optional(),
});

/** Arquivos já enviados à área temporária, a vincular ao salvar o pré-cadastro. */
export const arquivosPreCadastroSchema = z
  .array(
    z.object({
      chave: z.string().min(1).max(500),
      nomeOriginal: z.string().trim().min(1).max(300),
    }),
  )
  .max(MAX_ARQUIVOS_PRE_CADASTRO);

/** Lê o hidden `arquivos` (JSON) do FormData; ausente ou inválido → vazio. */
export function parseArquivosPreCadastro(raw: FormDataEntryValue | null) {
  try {
    const parsed = arquivosPreCadastroSchema.safeParse(
      raw ? JSON.parse(String(raw)) : [],
    );
    if (!parsed.success) return [];
    const vistos = new Set<string>();
    return parsed.data.filter((a) => !vistos.has(a.chave) && vistos.add(a.chave));
  } catch {
    return [];
  }
}

export const solicitarUploadPreCadastroSchema = z.object({
  sessaoId: z.string().max(60),
  nome: z.string().max(300),
  mime: z.string().max(100),
  tamanho: z.number().int(),
});
