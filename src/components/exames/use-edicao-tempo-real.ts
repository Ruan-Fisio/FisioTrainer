"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  autosalvarExame,
  sairDaEdicaoExame,
  sincronizarExame,
  type SincronizacaoExame,
} from "@/actions/exames";
import type { ExameDraft } from "@/lib/exame-draft";
import { iguais } from "@/lib/exame-merge";

/** Intervalo da sincronização (buscar o que os outros salvaram + salvar o meu). */
export const INTERVALO_SINCRONIZACAO_MS = 10_000;

export type StatusEdicao =
  | { tipo: "salvo"; em: Date | null }
  | { tipo: "pendente" }
  | { tipo: "salvando" }
  | { tipo: "invalido"; mensagem: string; path?: (string | number)[] }
  | { tipo: "falha" };

type Base = { id: string; carregadoEm: string; draft: ExameDraft };

/** Dá tempo do React renderizar o merge antes de ler o rascunho de novo. */
const esperarRender = () => new Promise((r) => setTimeout(r, 50));

/**
 * Edição em tempo real do modelo de exame. A cada `INTERVALO_SINCRONIZACAO_MS`:
 * busca o exame gravado e mescla no rascunho local o que os outros salvaram
 * (`aplicarMerge`, three-way com a última base sincronizada); se o rascunho tem
 * alterações minhas, salva — o server recusa se alguém gravou no meio
 * (trava otimista), e aí sincroniza, mescla e tenta de novo. Rascunho inválido
 * (fórmula/tabela/campo obrigatório) não é salvo: o status mostra o motivo.
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
  const [editores, setEditores] = useState(editoresIniciais);
  const [status, setStatus] = useState<StatusEdicao>({ tipo: "salvo", em: null });
  // Espelho da base em estado, para o render saber se há alteração pendente.
  const [baseDraft, setBaseDraft] = useState(inicial?.draft ?? null);

  useEffect(() => {
    draftRef.current = draftAtual;
    aplicarRef.current = aplicarMerge;
  });

  const temAlteracoes = () =>
    baseRef.current !== null && !iguais(draftRef.current, baseRef.current.draft);

  /** Absorve o estado do server: mescla no rascunho se mudou desde a base. */
  const absorver = useCallback((s: SincronizacaoExame, enviado?: ExameDraft) => {
    const base = baseRef.current;
    if (!base) return;
    const mudou = enviado !== undefined || s.id !== base.id || s.carregadoEm !== base.carregadoEm;
    if (mudou) {
      // Depois de salvar, a base do merge é o que foi enviado (o rascunho pode
      // ter mudado durante a requisição); numa busca, a última base.
      aplicarRef.current(enviado ?? base.draft, s.draft, s.mapaIds);
      baseRef.current = { id: s.id, carregadoEm: s.carregadoEm, draft: s.draft };
      setBaseDraft(s.draft);
    }
    setEditores(s.editores);
  }, []);

  const executar = useCallback(async (): Promise<boolean> => {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const base = baseRef.current;
      if (!base) return false;

      if (!temAlteracoes()) {
        const s = await sincronizarExame(base.id);
        if (s) absorver(s);
        await esperarRender();
        if (!temAlteracoes()) {
          setStatus((st) => (st.tipo === "salvo" ? st : { tipo: "salvo", em: new Date() }));
          return true;
        }
        continue;
      }

      setStatus({ tipo: "salvando" });
      const enviado = draftRef.current;
      const r = await autosalvarExame(base.id, enviado, base.carregadoEm);
      if (r.ok) {
        absorver(r.sincronizacao, enviado);
        await esperarRender();
        setStatus(
          temAlteracoes() ? { tipo: "pendente" } : { tipo: "salvo", em: new Date() },
        );
        return !temAlteracoes();
      }
      if (r.conflito) {
        // Alguém gravou no meio: traz o que mudou, mescla e tenta de novo.
        const s = await sincronizarExame(base.id);
        if (s) absorver(s);
        await esperarRender();
        continue;
      }
      setStatus({ tipo: "invalido", mensagem: r.error, path: r.errorPath });
      // Mesmo sem poder salvar, continua recebendo o que os outros salvam.
      const s = await sincronizarExame(base.id);
      if (s) absorver(s);
      return false;
    }
    setStatus({ tipo: "pendente" });
    return false;
  }, [absorver]);

  /** Roda um ciclo agora (ou espera o que está rodando). `true` = tudo salvo. */
  const sincronizarAgora = useCallback(async (): Promise<boolean> => {
    while (executando.current) await executando.current.catch(() => false);
    const ciclo = executar().catch(() => {
      setStatus({ tipo: "falha" });
      return false;
    });
    executando.current = ciclo;
    try {
      return await ciclo;
    } finally {
      executando.current = null;
    }
  }, [executar]);

  useEffect(() => {
    if (!ativo) return;
    const timer = setInterval(() => {
      if (!executando.current) void sincronizarAgora();
    }, INTERVALO_SINCRONIZACAO_MS);
    return () => clearInterval(timer);
  }, [ativo, sincronizarAgora]);

  // "Alterações pendentes" assim que o rascunho diverge da base.
  const pendente = ativo && baseDraft !== null && !iguais(draftAtual, baseDraft);
  const statusExibido: StatusEdicao =
    pendente && status.tipo === "salvo" ? { tipo: "pendente" } : status;

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

  return { status: statusExibido, editores, sincronizarAgora, temAlteracoes };
}
