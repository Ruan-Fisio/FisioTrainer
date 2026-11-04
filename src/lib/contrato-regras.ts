import { createHash, randomBytes } from "node:crypto";
import { HORAS_ANTECEDENCIA_CANCELAMENTO } from "@/lib/agendamento-cancelamento";
import { mascararCpf } from "@/lib/cpf";
import { formatarData, formatarDataSemHora, formatarMoeda } from "@/lib/format";
import { totalAtendimentosPlano } from "@/lib/plano-renovacao";
import { soDigitos } from "@/lib/telefone";
import {
  formaPagamentoPlanoLabels,
  periodicidadePlanoLabels,
  tipoPlanoLabels,
} from "@/lib/validations/plano";

/** Regras puras do contrato (servidor): variáveis, pendências, bloqueio de CPF, evidências. */

export const NAO_INFORMADO = "[não informado]";

export const MAX_TENTATIVAS_CPF = 5;
export const MINUTOS_BLOQUEIO_CPF = 15;
export const TAMANHO_MAXIMO_ASSINATURA = 300 * 1024;

export type DadosContrato = {
  numero: number;
  emitidoEm: Date;
  paciente: {
    nome: string;
    cpf: string | null;
    dataNascimento: Date | null;
    endereco: string | null;
    contato: string | null;
    email: string | null;
  };
  contratada: {
    name: string;
    razaoSocial: string | null;
    cpfCnpj: string | null;
    inscricaoMunicipal: string | null;
    endereco: string | null;
    telefone: string | null;
    email: string | null;
  } | null;
  plano: {
    nome: string;
    tipos: (keyof typeof tipoPlanoLabels)[];
    atendimentos: number | null;
    periodicidade: keyof typeof periodicidadePlanoLabels;
    formaPagamento: keyof typeof formaPagamentoPlanoLabels;
    numeroParcelas: number;
    valorOriginal: number;
    desconto: number;
    valor: number;
    dataInicio: Date;
    parcelas: { numero: number | null; vencimento: Date; valor: number }[];
  };
};

const ou = (valor: string | null | undefined) => valor?.trim() || NAO_INFORMADO;

export function formatarNumeroContrato(numero: number) {
  return `CT-${String(numero).padStart(6, "0")}`;
}

export function montarVariaveisContrato(dados: DadosContrato): Record<string, string> {
  const { paciente, contratada, plano } = dados;
  const totalPlano = totalAtendimentosPlano(plano.atendimentos, plano.periodicidade);

  return {
    "paciente.nome": ou(paciente.nome),
    "paciente.cpf": paciente.cpf ? mascararCpf(paciente.cpf) : NAO_INFORMADO,
    "paciente.data_nascimento": paciente.dataNascimento
      ? formatarDataSemHora(paciente.dataNascimento)
      : NAO_INFORMADO,
    "paciente.endereco": ou(paciente.endereco),
    "paciente.contato": ou(paciente.contato),
    "paciente.email": ou(paciente.email),

    "contratada.nome": ou(contratada?.razaoSocial || contratada?.name),
    "contratada.documento": ou(contratada?.cpfCnpj),
    "contratada.inscricao_municipal": ou(contratada?.inscricaoMunicipal),
    "contratada.endereco": ou(contratada?.endereco),
    "contratada.telefone": ou(contratada?.telefone),
    "contratada.email": ou(contratada?.email),

    "plano.nome": plano.nome,
    "plano.modalidades":
      plano.tipos.map((t) => tipoPlanoLabels[t]).join(" e ") || NAO_INFORMADO,
    "plano.atendimentos_mes": plano.atendimentos ? String(plano.atendimentos) : "sem limite definido",
    "plano.total_atendimentos": totalPlano ? String(totalPlano) : "sem limite definido",
    "plano.periodicidade": periodicidadePlanoLabels[plano.periodicidade],
    "plano.data_inicio": formatarData(plano.dataInicio),
    "plano.valor_original": formatarMoeda(plano.valorOriginal),
    "plano.desconto": formatarMoeda(plano.desconto),
    "plano.valor_total": formatarMoeda(plano.valor),
    "plano.forma_pagamento": formaPagamentoPlanoLabels[plano.formaPagamento],
    "plano.numero_parcelas": String(plano.numeroParcelas),
    "plano.parcelas":
      plano.parcelas
        .map(
          (p, i) =>
            `Parcela ${p.numero ?? i + 1}: vencimento em ${formatarData(p.vencimento)}, ${formatarMoeda(p.valor)}`,
        )
        .join("\n") || NAO_INFORMADO,

    "contrato.numero": formatarNumeroContrato(dados.numero),
    "contrato.data_emissao": formatarData(dados.emitidoEm),
    "regras.horas_cancelamento": String(HORAS_ANTECEDENCIA_CANCELAMENTO),
  };
}

export function hashSha256(conteudo: string | Uint8Array) {
  return createHash("sha256").update(conteudo).digest("hex");
}

/**
 * Identifica o que foi contratado (só variáveis `plano.*`): editar a atribuição sem mudar
 * nada disso não exige nova assinatura, e mudar o endereço do paciente também não.
 */
export function hashDadosPlano(variaveis: Record<string, string>) {
  const doPlano = Object.entries(variaveis)
    .filter(([chave]) => chave.startsWith("plano."))
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return hashSha256(JSON.stringify(doPlano));
}

export type PendenciasContrato = {
  /** Impedem a assinatura. */
  bloqueios: string[];
  /** Saem como "[não informado]" no contrato, mas não impedem a assinatura. */
  avisos: string[];
};

export function pendenciasContrato(
  dados: Pick<DadosContrato, "paciente" | "contratada">,
): PendenciasContrato {
  const { paciente, contratada } = dados;
  const bloqueios: string[] = [];
  const avisos: string[] = [];

  if (!soDigitos(paciente.cpf ?? "")) bloqueios.push("CPF do paciente");
  if (!contratada) bloqueios.push("Dados da clínica (selecione a contratada no modelo)");
  else if (!contratada.cpfCnpj?.trim()) bloqueios.push("CPF/CNPJ da clínica");

  if (!paciente.endereco?.trim()) avisos.push("Endereço do paciente");
  if (contratada && !contratada.endereco?.trim()) avisos.push("Endereço da clínica");

  return { bloqueios, avisos };
}

export function cpfBloqueado(bloqueadoAte: Date | null, agora = new Date()) {
  return !!bloqueadoAte && bloqueadoAte.getTime() > agora.getTime();
}

/** Estado após um CPF errado: a 5ª falha trava por 15 minutos e zera o contador. */
export function estadoAposFalhaCpf(tentativas: number, agora = new Date()) {
  const novas = tentativas + 1;
  if (novas >= MAX_TENTATIVAS_CPF) {
    return {
      tentativasCpf: 0,
      bloqueadoAte: new Date(agora.getTime() + MINUTOS_BLOQUEIO_CPF * 60_000),
    };
  }
  return { tentativasCpf: novas, bloqueadoAte: null };
}

/** Decodifica a assinatura desenhada. Devolve null se não for um PNG válido e de tamanho aceitável. */
export function decodificarAssinaturaPng(dataUrl: unknown): Buffer | null {
  const prefixo = "data:image/png;base64,";
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(prefixo)) return null;
  const base64 = dataUrl.slice(prefixo.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > TAMANHO_MAXIMO_ASSINATURA) return null;
  const cabecalhoPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 67 || !bytes.subarray(0, 8).equals(cabecalhoPng)) return null;
  return bytes;
}

/** IP de quem assinou: primeiro da cadeia do proxy (Vercel), ou "não identificado". */
export function ipDoAssinante(forwardedFor: string | null, realIp: string | null) {
  return forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "não identificado";
}

export function gerarTokenContrato() {
  return randomBytes(32).toString("base64url");
}
