"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  autosalvarExame,
  sairDaEdicaoExame,
  sincronizarExame,
  type SincronizacaoExame,
} from "@/actions/exames";
import type { ExameDraft } from "@/lib/exame-draft";
import { iguais, remapearSecoes } from "@/lib/exame-merge";
import { resumirMudancas } from "@/lib/exame-mudancas";

/** Intervalo da sincronização (buscar o que os outros salvaram + salvar o meu). */
export const INTERVALO_SINCRONIZACAO_MS = 10_000;

/** O que o ciclo está fazendo agora. */
export type FaseSincronizacao = "ocioso" | "buscando" | "salvando";

export type ErroSincronizacao =
  | { tipo: "invalido"; mensagem: string; path?: (string | number)[] }
  | { tipo: "falha" };

/** Alterações de outra pessoa que chegaram no último ciclo que trouxe algo. */
export type AlteracaoRecebida = {
  por: string | null;
  /** Quando a outra pessoa gravou. */
  em: Date;
  /** Quando chegou nesta tela (destaque temporário no indicador). */
  chegouEm: Date;
  itens: string[];
};

export type EstadoEdicao = {
  fase: FaseSincronizacao;
  /** Há alteração minha ainda não gravada. */
  pendente: boolean;
  erro: ErroSincronizacao | null;
  ultimoSalvoEm: Date | null;
  ultimaVerificacaoEm: Date | null;
  recebido: AlteracaoRecebida | null;
  /** Quando roda o próximo ciclo (epoch ms) — contagem regressiva. */
  proximaSincronizacaoEm: number | null;
  editores: string[];
};

type Base = { id: string; carregadoEm: string; draft: ExameDraft };

/** Dá tempo do React renderizar o merge antes de ler o rascunho de novo. */
const esperarRender = () => new Promise((r) => setTimeout(r, 50));

/**
 * Edição em tempo real do modelo de exame. A cada `INTERVALO_SINCRONIZACAO_MS`:
 * busca o exame gravado e mescla no rascunho local o que os outros salvaram
 * (`aplicarMerge`, three-way com a última base sincronizada); se o rascunho tem
 * alterações minhas, salva — o server recusa se alguém gravou no meio
 * (trava otimista), e aí sincroniza, mescla e tenta de novo. Rascunho inválido
 * (fórmula/tabela/campo obrigatório) não é salvo: o estado traz o motivo.
 *
 * `aplicarMerge(base, deles, mapaIds)` atualiza o estado do form com setters
 * funcionais (o merge sempre roda sobre o rascunho mais recente, mesmo que a
 * pessoa tenha digitado durante a requisição).
 */
export function useEdicaoTempoReal({
  ativo,
  inicial,
  editoresIniciais,
  draftAtual,
  aplicarMerge,
}: {
  ativo: boolean;
  inicial: Base | null;
  editoresIniciais: string[];
  draftAtual: ExameDraft;
  aplicarMerge: (base: ExameDraft, deles: ExameDraft, mapaIds: Record<string, string>) => void;
}) {
  const baseRef = useRef<Base | null>(inicial);
  const draftRef = useRef(draftAtual);
  const aplicarRef = useRef(aplicarMerge);
  const executando = useRef<Promise<boolean> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ativoRef = useRef(ativo);
  // O timer re-agenda o próximo ciclo pela ref (o callback não chama a si mesmo).
  const agendarRef = useRef<() => void>(() => {});

  const [fase, setFase] = useState<FaseSincronizacao>("ocioso");
  const [erro, setErro] = useState<ErroSincronizacao | null>(null);
  const [ultimoSalvoEm, setUltimoSalvoEm] = useState<Date | null>(null);
  const [ultimaVerificacaoEm, setUltimaVerificacaoEm] = useState<Date | null>(null);
  const [recebido, setRecebido] = useState<AlteracaoRecebida | null>(null);
  const [proximaSincronizacaoEm, setProximaSincronizacaoEm] = useState<number | null>(null);
  const [editores, setEditores] = useState(editoresIniciais);
  // Espelho da base em estado, para o render saber se há alteração pendente.
  const [baseDraft, setBaseDraft] = useState(inicial?.draft ?? null);

  useEffect(() => {
    draftRef.current = draftAtual;
    aplicarRef.current = aplicarMerge;
    ativoRef.current = ativo;
  });

  const temAlteracoes = () =>
    baseRef.current !== null && !iguais(draftRef.current, baseRef.current.draft);

  /** Absorve o estado do server: mescla no rascunho se mudou desde a base. */
  const absorver = useCallback((s: SincronizacaoExame, enviado?: ExameDraft) => {
    const base = baseRef.current;
    if (!base) return;
    setEditores(s.editores);
    setUltimaVerificacaoEm(new Date());
    const mudou = enviado !== undefined || s.id !== base.id || s.carregadoEm !== base.carregadoEm;
    if (!mudou) return;

    if (enviado === undefined) {
      // Veio de outra pessoa (numa busca): registra quem e o quê.
      const itens = resumirMudancas(
        { ...base.draft, secoes: remapearSecoes(base.draft.secoes, s.mapaIds) },
        s.draft,
      );
      if (itens.length > 0) {
        setRecebido({
          por: s.ultimaAlteracao?.por ?? null,
          em: s.ultimaAlteracao ? new Date(s.ultimaAlteracao.em) : new Date(),
          chegouEm: new Date(),
          itens,
        });
      }
    }
    // Depois de salvar, a base do merge é o que foi enviado (o rascunho pode
    // ter mudado durante a requisição); numa busca, a última base.
    aplicarRef.current(enviado ?? base.draft, s.draft, s.mapaIds);
    if (s.id !== base.id) {
      // Virou versão nova: atualiza a URL sem navegar (navegar remontaria o
      // form e jogaria a tela para o topo); recarregar já abre a versão atual.
      window.history.replaceState(null, "", `/exames/${s.id}/editar`);
    }
    baseRef.current = { id: s.id, carregadoEm: s.carregadoEm, draft: s.draft };
    setBaseDraft(s.draft);
  }, []);

  const buscar = useCallback(
    async (id: string) => {
      setFase("buscando");
      const s = await sincronizarExame(id);
      if (s) absorver(s);
    },
    [absorver],
  );

  const executar = useCallback(async (): Promise<boolean> => {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const base = baseRef.current;
      if (!base) return false;

      if (!temAlteracoes()) {
        await buscar(base.id);
        await esperarRender();
        if (!temAlteracoes()) {
          setErro(null);
          return true;
        }
        continue;
      }

      setFase("salvando");
      const enviado = draftRef.current;
      const r = await autosalvarExame(base.id, enviado, base.carregadoEm);
      if (r.ok) {
        absorver(r.sincronizacao, enviado);
        setUltimoSalvoEm(new Date());
        setErro(null);
        await esperarRender();
        return !temAlteracoes();
      }
      if (r.conflito) {
        // Alguém gravou no meio: traz o que mudou, mescla e tenta de novo.
        await buscar(base.id);
        await esperarRender();
        continue;
      }
      setErro({ tipo: "invalido", mensagem: r.error, path: r.errorPath });
      // Mesmo sem poder salvar, continua recebendo o que os outros salvam.
      await buscar(base.id);
      return false;
    }
    return false;
  }, [absorver, buscar]);

  /** Roda um ciclo (ou espera o que está rodando). `true` = tudo salvo. */
  const rodarCiclo = useCallback(async (): Promise<boolean> => {
    while (executando.current) await executando.current.catch(() => false);
    const ciclo = executar().catch(() => {
      setErro({ tipo: "falha" });
      return false;
    });
    executando.current = ciclo;
    try {
      return await ciclo;
    } finally {
      executando.current = null;
      setFase("ocioso");
    }
  }, [executar]);

  const agendar = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!ativoRef.current) return;
    setProximaSincronizacaoEm(Date.now() + INTERVALO_SINCRONIZACAO_MS);
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      setProximaSincronizacaoEm(null);
      await rodarCiclo();
      agendarRef.current();
    }, INTERVALO_SINCRONIZACAO_MS);
  }, [rodarCiclo]);

  useEffect(() => {
    agendarRef.current = agendar;
  }, [agendar]);

  /** Sincroniza agora e reinicia a contagem. `true` = tudo salvo. */
  const sincronizarAgora = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setProximaSincronizacaoEm(null);
    try {
      return await rodarCiclo();
    } finally {
      agendar();
    }
  }, [rodarCiclo, agendar]);

  useEffect(() => {
    if (!ativo) return;
    agendar();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [ativo, agendar]);

  // Aba ficou oculta (trocou de aba, minimizou, começou a fechar): salva já,
  // sem esperar o próximo ciclo.
  useEffect(() => {
    if (!ativo) return;
    const aoOcultar = () => {
      if (document.visibilityState === "hidden" && temAlteracoes()) void sincronizarAgora();
    };
    document.addEventListener("visibilitychange", aoOcultar);
    return () => document.removeEventListener("visibilitychange", aoOcultar);
  }, [ativo, sincronizarAgora]);

  // Saindo com alteração não salva: o navegador pede confirmação.
  useEffect(() => {
    if (!ativo) return;
    const aviso = (e: BeforeUnloadEvent) => {
      if (temAlteracoes()) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [ativo]);

  // Fechou a tela: sai da lista "também está editando".
  useEffect(() => {
    if (!ativo) return;
    return () => {
      const id = baseRef.current?.id;
      if (id) void sairDaEdicaoExame(id).catch(() => {});
    };
  }, [ativo]);

  const estado: EstadoEdicao = {
    fase,
    pendente: ativo && baseDraft !== null && !iguais(draftAtual, baseDraft),
    erro,
    ultimoSalvoEm,
    ultimaVerificacaoEm,
    recebido,
    proximaSincronizacaoEm,
    editores,
  };

  return { estado, sincronizarAgora, temAlteracoes };
}
