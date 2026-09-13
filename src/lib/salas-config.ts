import { cache } from "react";
import type { ModalidadeAgendamento } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { MODALIDADE_SALA_PADRAO, type ConfigSala } from "@/lib/salas";

/**
 * Configuração de sala/capacidade por modalidade.
 *
 * - Educação Física e Fisioterapia: lidas do model `Sala` (aba Salas de /configuracoes).
 *   Capacidade = soma da coluna daquela modalidade em todas as salas; nome = as salas com
 *   capacidade > 0. Sem sala configurada (ou soma 0) cai em `MODALIDADE_SALA_PADRAO`, então
 *   o motor de capacidade da agenda nunca quebra.
 * - Avaliação e Terapia Manual: sempre `MODALIDADE_SALA_PADRAO` (não são configuráveis).
 *
 * `cache()` dedupe por request.
 */
export const getConfigSalas = cache(
  async (): Promise<Record<ModalidadeAgendamento, ConfigSala>> => {
    const salas = await prisma.sala.findMany({
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: {
        nome: true,
        capacidadeEducacaoFisica: true,
        capacidadeFisioterapia: true,
      },
    });

    const montar = (
      capacidadeDe: (s: (typeof salas)[number]) => number,
      padrao: ConfigSala,
    ): ConfigSala => {
      const comVaga = salas.filter((s) => capacidadeDe(s) > 0);
      const capacidade = comVaga.reduce((soma, s) => soma + capacidadeDe(s), 0);
      if (capacidade === 0) return padrao;
      return { sala: comVaga.map((s) => s.nome).join(", "), capacidade };
    };

    return {
      ...MODALIDADE_SALA_PADRAO,
      EDUCACAO_FISICA: montar(
        (s) => s.capacidadeEducacaoFisica,
        MODALIDADE_SALA_PADRAO.EDUCACAO_FISICA,
      ),
      FISIOTERAPIA: montar(
        (s) => s.capacidadeFisioterapia,
        MODALIDADE_SALA_PADRAO.FISIOTERAPIA,
      ),
    };
  },
);
