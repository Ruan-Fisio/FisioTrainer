"use server";

import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { getObjectBytes } from "@/lib/r2";
import { inicioDoDia } from "@/lib/datas-brasilia";
import { resultadoAnaliseSchema, type ResultadoAnalise } from "@/lib/analise-postural";
import {
  criarPipelinePostural,
  etapasFake,
  etapasGemini,
  type SaidaPipeline,
} from "@/lib/analise-postural-pipeline";
import { iaAnaliseDisponivel, limiteDiarioIa, modeloIa, modoFakeIa } from "@/lib/ia-config";

/** Formatos que o Gemini lê e que a aba Imagens mostra. */
const MIMES_ACEITOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const TAMANHO_MAXIMO = 15 * 1024 * 1024;
const TIMEOUT_MS = 45_000;

/**
 * Roda a análise postural por IA numa imagem já anexada (ver
 * `specs/003-analise-postural-ia.md`). Só devolve vista + pontos: as marcações
 * são montadas no editor e gravadas apenas quando o fisio clicar em Salvar.
 */
export async function analisarPosturaImagem(
  imagemId: string,
): Promise<{ error: string } | { ok: true; resultado: ResultadoAnalise }> {
  const usuario = await exigirSessao();

  if (!iaAnaliseDisponivel()) return { error: "A análise por IA não está configurada." };

  const imagem = await prisma.exameExecucaoImagem.findUnique({
    where: { id: imagemId },
    select: { id: true, chave: true, mime: true, tamanho: true },
  });
  if (!imagem) return { error: "Imagem não encontrada." };
  if (!MIMES_ACEITOS.has(imagem.mime)) {
    return { error: "A análise por IA aceita apenas fotos JPEG, PNG ou WebP." };
  }
  if (imagem.tamanho > TAMANHO_MAXIMO) return { error: "Imagem grande demais para análise (máx. 15 MB)." };

  const usadas = await prisma.analiseImagemIa.count({
    where: { userId: usuario.id, createdAt: { gte: inicioDoDia() } },
  });
  if (usadas >= limiteDiarioIa()) return { error: "Limite diário de análises por IA atingido." };

  const fake = modoFakeIa();
  const modelo = fake ? "fake" : modeloIa();

  let saida: SaidaPipeline;
  try {
    const bytes = await getObjectBytes(imagem.chave);
    const pipeline = criarPipelinePostural(
      fake ? etapasFake() : etapasGemini({ apiKey: process.env.GEMINI_API_KEY!, modelo }),
    );
    saida = await pipeline.invoke(
      { base64: Buffer.from(bytes).toString("base64"), mime: imagem.mime },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
  } catch (e) {
    // Nunca logar a imagem; só a mensagem do erro.
    console.error("Falha na análise postural por IA:", e instanceof Error ? e.message : e);
    await registrarUso({ imagemId, userId: usuario.id, modelo, sucesso: false });
    return { error: "Não foi possível analisar a imagem agora. Tente novamente." };
  }

  const validado = resultadoAnaliseSchema.safeParse(saida.resultado);
  await registrarUso({
    imagemId,
    userId: usuario.id,
    modelo,
    sucesso: validado.success,
    vista: validado.success ? validado.data.vista : null,
    tokensEntrada: saida.uso.entrada,
    tokensSaida: saida.uso.saida,
  });
  if (!validado.success) return { error: "A IA devolveu uma resposta inválida. Tente novamente." };

  return { ok: true, resultado: validado.data };
}

async function registrarUso(dados: {
  imagemId: string;
  userId: string;
  modelo: string;
  sucesso: boolean;
  vista?: string | null;
  tokensEntrada?: number;
  tokensSaida?: number;
}) {
  await prisma.analiseImagemIa.create({ data: dados });
}
