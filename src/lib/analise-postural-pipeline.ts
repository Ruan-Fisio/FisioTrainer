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
  ehFrontal,
  ehLateral,
  pontosFrontaisSchema,
  pontosLateraisSchema,
  promptLocalizar,
  type Classificacao,
  type PontosFrontais,
  type PontosLaterais,
  type ResultadoAnalise,
  type VistaPostural,
} from "@/lib/analise-postural";

/**
 * Pipeline LangChain da análise postural (ver `specs/003-analise-postural-ia.md`):
 *
 *   foto ─► classificar ─► vista ─┬─ anterior/posterior ─► localizar pontos frontais
 *                                 ├─ laterais ───────────► localizar pontos laterais
 *                                 └─ nao_postural ───────► fim (sem 2ª chamada)
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
  localizarFrontal: Runnable<EntradaLocalizar, SaidaEtapa<PontosFrontais>>;
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

  const frontal = RunnableLambda.from(
    async (x: Classificado, config?: RunnableConfig): Promise<SaidaPipeline> => {
      const { vista, confianca } = x.classificacao.dados;
      if (!ehFrontal(vista)) throw new Error("Vista não frontal no ramo frontal.");
      const loc = await etapas.localizarFrontal.invoke(
        { base64: x.base64, mime: x.mime, vista },
        config,
      );
      return {
        resultado: { vista, confianca, pontos: loc.dados },
        uso: somar(x.classificacao.uso, loc.uso),
      };
    },
  ).withConfig({ runName: "localizar_frontal" });

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
    [(x) => ehFrontal(x.classificacao.dados.vista), frontal],
    [(x) => ehLateral(x.classificacao.dados.vista), lateral],
    naoPostural,
  ]);

  return RunnableSequence.from<EntradaImagem, SaidaPipeline>([classificar, rotear]).withConfig({
    runName: "analise_postural",
  });
}

// ---------- etapas reais (Gemini) ----------

export function etapasGemini(opcoes: { apiKey: string; modelo: string }): EtapasPostural {
  const llm = new ChatGoogleGenerativeAI({
    apiKey: opcoes.apiKey,
    model: opcoes.modelo,
    temperature: 0,
    maxRetries: 1,
  });

  function etapa<S extends z.ZodType, E extends EntradaImagem>(
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
    classificar: etapa(classificacaoSchema, () => PROMPT_CLASSIFICAR),
    localizarFrontal: etapa(pontosFrontaisSchema, (x: EntradaLocalizar) => promptLocalizar(x.vista)),
    localizarLateral: etapa(pontosLateraisSchema, (x: EntradaLocalizar) => promptLocalizar(x.vista)),
  };
}

// ---------- etapas fake (E2E / dev sem chave) ----------

const SEM_USO: Uso = { entrada: 0, saida: 0 };

/** Resposta fixa e plausível de uma foto anterior, sem rede. */
export function etapasFake(vista: VistaPostural = "anterior"): EtapasPostural {
  return {
    classificar: RunnableLambda.from(() => ({ dados: { vista, confianca: 1 }, uso: SEM_USO })),
    localizarFrontal: RunnableLambda.from(() => ({
      dados: {
        cabeca_direita: { x: 460, y: 140 },
        cabeca_esquerda: { x: 540, y: 135 },
        ombro_direito: { x: 320, y: 300 },
        ombro_esquerdo: { x: 680, y: 285 },
        pelve_direita: { x: 410, y: 560 },
        pelve_esquerda: { x: 590, y: 555 },
        coluna:
          vista === "posterior"
            ? [
                { x: 500, y: 260 },
                { x: 506, y: 340 },
                { x: 514, y: 420 },
                { x: 508, y: 500 },
                { x: 500, y: 570 },
              ]
            : undefined,
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
