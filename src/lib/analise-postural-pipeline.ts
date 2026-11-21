import { HumanMessage, type AIMessage } from "@langchain/core/messages";
import {
  RunnableBranch,
  RunnableLambda,
  RunnableSequence,
  type Runnable,
  type RunnableConfig,
} from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { z } from "zod";
import {
  PROMPT_CLASSIFICAR,
  classificacaoSchema,
  ehLateral,
  pontosAnteriorSchema,
  pontosLateraisSchema,
  pontosPosteriorSchema,
  promptLocalizar,
  type Classificacao,
  type PontosAnterior,
  type PontosLaterais,
  type PontosPosterior,
  type ResultadoAnalise,
  type VistaPostural,
} from "@/lib/analise-postural";

/**
 * Pipeline LangChain da análise postural (ver `specs/003-analise-postural-ia.md`):
 *
 *   foto ─► classificar ─► vista ─┬─ anterior ─► localizar pontos do protocolo anterior
 *          (modelo leve)          ├─ posterior ─► localizar pontos do protocolo posterior
 *                                 ├─ laterais ──► localizar pontos laterais
 *                                 └─ nao_postural ─► fim (sem 2ª chamada)
 *                                     (localização: modelo mais preciso, ex. Gemini Pro)
 *
 * As etapas são `Runnable`s injetáveis: Gemini em produção, `etapasFake()` em
 * teste/E2E — o roteamento é sempre este mesmo código.
 */

export type EntradaImagem = { base64: string; mime: string };
export type EntradaLocalizar = EntradaImagem & { vista: VistaPostural };
export type Uso = { entrada: number; saida: number };
export type SaidaEtapa<T> = { dados: T; uso: Uso };

export type EtapasPostural = {
  classificar: Runnable<EntradaImagem, SaidaEtapa<Classificacao>>;
  localizarAnterior: Runnable<EntradaLocalizar, SaidaEtapa<PontosAnterior>>;
  localizarPosterior: Runnable<EntradaLocalizar, SaidaEtapa<PontosPosterior>>;
  localizarLateral: Runnable<EntradaLocalizar, SaidaEtapa<PontosLaterais>>;
};

export type SaidaPipeline = { resultado: ResultadoAnalise; uso: Uso };

type Classificado = EntradaImagem & { classificacao: SaidaEtapa<Classificacao> };

const somar = (a: Uso, b: Uso): Uso => ({ entrada: a.entrada + b.entrada, saida: a.saida + b.saida });

export function criarPipelinePostural(
  etapas: EtapasPostural,
): Runnable<EntradaImagem, SaidaPipeline> {
  const classificar = RunnableLambda.from(
    async (x: EntradaImagem, config?: RunnableConfig): Promise<Classificado> => ({
      ...x,
      classificacao: await etapas.classificar.invoke(x, config),
    }),
  ).withConfig({ runName: "classificar_vista" });

  const anterior = RunnableLambda.from(
    async (x: Classificado, config?: RunnableConfig): Promise<SaidaPipeline> => {
      const { confianca } = x.classificacao.dados;
      const loc = await etapas.localizarAnterior.invoke(
        { base64: x.base64, mime: x.mime, vista: "anterior" },
        config,
      );
      return {
        resultado: { vista: "anterior", confianca, pontos: loc.dados },
        uso: somar(x.classificacao.uso, loc.uso),
      };
    },
  ).withConfig({ runName: "localizar_anterior" });

  const posterior = RunnableLambda.from(
    async (x: Classificado, config?: RunnableConfig): Promise<SaidaPipeline> => {
      const { confianca } = x.classificacao.dados;
      const loc = await etapas.localizarPosterior.invoke(
        { base64: x.base64, mime: x.mime, vista: "posterior" },
        config,
      );
      return {
        resultado: { vista: "posterior", confianca, pontos: loc.dados },
        uso: somar(x.classificacao.uso, loc.uso),
      };
    },
  ).withConfig({ runName: "localizar_posterior" });

  const lateral = RunnableLambda.from(
    async (x: Classificado, config?: RunnableConfig): Promise<SaidaPipeline> => {
      const { vista, confianca } = x.classificacao.dados;
      if (!ehLateral(vista)) throw new Error("Vista não lateral no ramo lateral.");
      const loc = await etapas.localizarLateral.invoke(
        { base64: x.base64, mime: x.mime, vista },
        config,
      );
      return {
        resultado: { vista, confianca, pontos: loc.dados },
        uso: somar(x.classificacao.uso, loc.uso),
      };
    },
  ).withConfig({ runName: "localizar_lateral" });

  const naoPostural = RunnableLambda.from(
    (x: Classificado): SaidaPipeline => ({
      resultado: { vista: "nao_postural", confianca: x.classificacao.dados.confianca },
      uso: x.classificacao.uso,
    }),
  );

  const rotear = RunnableBranch.from<Classificado, SaidaPipeline>([
    [(x) => x.classificacao.dados.vista === "anterior", anterior],
    [(x) => x.classificacao.dados.vista === "posterior", posterior],
    [(x) => ehLateral(x.classificacao.dados.vista), lateral],
    naoPostural,
  ]);

  return RunnableSequence.from<EntradaImagem, SaidaPipeline>([classificar, rotear]).withConfig({
    runName: "analise_postural",
  });
}

// ---------- etapas reais (Gemini) ----------

export function etapasGemini(opcoes: {
  apiKey: string;
  /** Classificação da vista (modelo leve). */
  modelo: string;
  /** Localização dos pontos (modelo mais preciso). */
  modeloPontos: string;
}): EtapasPostural {
  const criar = (model: string) =>
    new ChatGoogleGenerativeAI({ apiKey: opcoes.apiKey, model, temperature: 0, maxRetries: 1 });
  const leve = criar(opcoes.modelo);
  const preciso = criar(opcoes.modeloPontos);

  function etapa<S extends z.ZodType, E extends EntradaImagem>(
    llm: ChatGoogleGenerativeAI,
    schema: S,
    prompt: (x: E) => string,
  ): Runnable<E, SaidaEtapa<z.infer<S>>> {
    const estruturado = llm.withStructuredOutput(schema, { includeRaw: true });
    return RunnableLambda.from(async (x: E, config?: RunnableConfig) => {
      const mensagem = new HumanMessage({
        content: [
          { type: "text", text: prompt(x) },
          { type: "image_url", image_url: `data:${x.mime};base64,${x.base64}` },
        ],
      });
      const r = await estruturado.invoke([mensagem], config);
      const uso = (r.raw as AIMessage).usage_metadata;
      return {
        dados: r.parsed as z.infer<S>,
        uso: { entrada: uso?.input_tokens ?? 0, saida: uso?.output_tokens ?? 0 },
      };
    });
  }

  return {
    classificar: etapa(leve, classificacaoSchema, () => PROMPT_CLASSIFICAR),
    localizarAnterior: etapa(preciso, pontosAnteriorSchema, (x: EntradaLocalizar) =>
      promptLocalizar(x.vista),
    ),
    localizarPosterior: etapa(preciso, pontosPosteriorSchema, (x: EntradaLocalizar) =>
      promptLocalizar(x.vista),
    ),
    localizarLateral: etapa(preciso, pontosLateraisSchema, (x: EntradaLocalizar) =>
      promptLocalizar(x.vista),
    ),
  };
}

// ---------- etapas fake (E2E / dev sem chave) ----------

const SEM_USO: Uso = { entrada: 0, saida: 0 };

/** Resposta fixa e plausível de uma foto anterior, sem rede. */
export function etapasFake(vista: VistaPostural = "anterior"): EtapasPostural {
  return {
    classificar: RunnableLambda.from(() => ({ dados: { vista, confianca: 1 }, uso: SEM_USO })),
    // Pontos do esquema "Protocolo FisioTrainer" (ombro esquerdo um pouco mais baixo).
    localizarAnterior: RunnableLambda.from(() => ({
      dados: {
        vertice: { x: 511, y: 19 },
        acromio_direito: { x: 216, y: 193 },
        acromio_esquerdo: { x: 793, y: 213 },
        manubrio: { x: 511, y: 246 },
        eias_direita: { x: 309, y: 437 },
        eias_esquerda: { x: 689, y: 437 },
        patela_direita: { x: 358, y: 718 },
        patela_esquerda: { x: 644, y: 718 },
        tornozelo_direito: { x: 358, y: 919 },
        tornozelo_esquerdo: { x: 638, y: 919 },
        pe_direito: { x: 342, y: 955 },
        pe_esquerdo: { x: 656, y: 955 },
      },
      uso: SEM_USO,
    })),
    localizarPosterior: RunnableLambda.from(() => ({
      dados: {
        vertice: { x: 489, y: 21 },
        c7: { x: 489, y: 172 },
        acromio_direito: { x: 782, y: 192 },
        acromio_esquerdo: { x: 184, y: 210 },
        escapula_direita: { x: 649, y: 299 },
        escapula_esquerda: { x: 313, y: 299 },
        eips_direita: { x: 660, y: 442 },
        eips_esquerda: { x: 311, y: 442 },
        joelho_direito: { x: 618, y: 713 },
        joelho_esquerdo: { x: 353, y: 713 },
        calcaneo_direito: { x: 627, y: 945 },
        calcaneo_esquerdo: { x: 336, y: 945 },
      },
      uso: SEM_USO,
    })),
    localizarLateral: RunnableLambda.from(() => ({
      dados: {
        trago: { x: 540, y: 130 },
        acromio: { x: 515, y: 260 },
        trocanter: { x: 500, y: 520 },
        joelho: { x: 505, y: 750 },
        maleolo: { x: 495, y: 950 },
      },
      uso: SEM_USO,
    })),
  };
}
