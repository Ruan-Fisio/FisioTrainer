import { z } from "zod";
import {
  camposDoTipo,
  type CampoDocumento,
  type LembrarDocumento,
  type TipoDocumento,
  type ValoresDocumento,
} from "@/lib/documentos-catalogo";
import { formatarYmd, toDateInputValue, ymdDataSemHora } from "@/lib/format";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export type PacienteParaDocumento = {
  nome: string;
  dataNascimento: Date | null;
  cpf: string | null;
};

/**
 * Valores iniciais de um documento novo: dados do paciente, a data de hoje (Brasília) e
 * os dados do profissional lembrados do último documento emitido.
 */
export function valoresIniciais(
  tipo: TipoDocumento,
  paciente: PacienteParaDocumento,
  lembrados: Partial<Record<LembrarDocumento, string>> = {},
  agora: Date = new Date(),
): ValoresDocumento {
  const valores: ValoresDocumento = {};
  for (const campo of camposDoTipo(tipo)) {
    let v: string | undefined;
    switch (campo.prefill) {
      case "paciente.nome":
        v = paciente.nome;
        break;
      case "paciente.nascimento":
        v = paciente.dataNascimento ? ymdDataSemHora(paciente.dataNascimento) : undefined;
        break;
      case "paciente.documento":
        v = paciente.cpf ? `CPF ${paciente.cpf}` : undefined;
        break;
      case "hoje":
        v = toDateInputValue(agora);
        break;
    }
    if (v === undefined && campo.lembrar) v = lembrados[campo.lembrar];
    if (v !== undefined && v !== "") valores[campo.nome] = truncar(v, campo.max);
  }
  return valores;
}

function truncar(v: string, max?: number) {
  return max && v.length > max ? v.slice(0, max) : v;
}

/**
 * Dados do profissional lembrados a partir dos documentos mais recentes (o primeiro
 * valor não vazio de cada chave, na ordem recebida — passe do mais novo ao mais antigo).
 */
export function extrairLembrados(
  documentos: { tipo: TipoDocumento | undefined; valores: ValoresDocumento }[],
): Partial<Record<LembrarDocumento, string>> {
  const lembrados: Partial<Record<LembrarDocumento, string>> = {};
  for (const { tipo, valores } of documentos) {
    if (!tipo) continue;
    for (const campo of camposDoTipo(tipo)) {
      if (!campo.lembrar || lembrados[campo.lembrar]) continue;
      const v = valores[campo.nome];
      if (typeof v === "string" && v.trim()) lembrados[campo.lembrar] = v.trim();
    }
  }
  return lembrados;
}

/** Lê os campos do tipo de um FormData (checkbox marcado chega como "on"). */
export function lerValoresDoFormData(tipo: TipoDocumento, formData: FormData): Record<string, unknown> {
  const bruto: Record<string, unknown> = {};
  for (const campo of camposDoTipo(tipo)) {
    const v = formData.get(campo.nome);
    bruto[campo.nome] = campo.tipo === "checkbox" ? v === "on" || v === "true" : typeof v === "string" ? v : "";
  }
  return bruto;
}

function schemaDoCampo(campo: CampoDocumento) {
  if (campo.tipo === "checkbox") return z.boolean();
  let s = z.string().trim();
  if (campo.max) s = s.max(campo.max, `${campo.label}: no máximo ${campo.max} caracteres.`);
  if (campo.tipo === "data") {
    return s.refine((v) => v === "" || (YMD.test(v) && dataValida(v)), `${campo.label}: data inválida.`);
  }
  if (campo.tipo === "hora") {
    return s.refine((v) => v === "" || HHMM.test(v), `${campo.label}: horário inválido.`);
  }
  return s;
}

function dataValida(ymd: string) {
  const [a, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Schema zod dos valores de um tipo: só aceita os campos do catálogo. */
export function schemaValoresDocumento(tipo: TipoDocumento) {
  const shape: Record<string, z.ZodType> = {};
  for (const campo of camposDoTipo(tipo)) shape[campo.nome] = schemaDoCampo(campo).optional();
  return z.object(shape).strict();
}

/** Valida e normaliza: remove textos vazios e checkboxes desmarcados. */
export function validarValoresDocumento(
  tipo: TipoDocumento,
  bruto: unknown,
): { ok: true; valores: ValoresDocumento } | { ok: false; erro: string } {
  const r = schemaValoresDocumento(tipo).safeParse(bruto);
  if (!r.success) return { ok: false, erro: r.error.issues[0]?.message ?? "Dados inválidos." };
  const valores: ValoresDocumento = {};
  for (const [k, v] of Object.entries(r.data)) {
    if (v === true || (typeof v === "string" && v !== "")) valores[k] = v as string | boolean;
  }
  return { ok: true, valores };
}

/** Valor como vai impresso no PDF (datas em DD/MM/AAAA). */
export function valorParaPdf(campo: CampoDocumento, valor: string): string {
  if (campo.tipo === "data" && YMD.test(valor)) return formatarYmd(valor);
  return valor;
}

/** "Atestado_fisioterapeutico_Maria_Souza.pdf" — só ASCII, seguro em Content-Disposition. */
export function nomeArquivoDocumento(titulo: string, paciente: string) {
  const limpar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  return `${limpar(titulo)}_${limpar(paciente)}.pdf`;
}

/**
 * As fontes padrão do PDF (Helvetica, WinAnsi) não desenham emoji nem caracteres fora
 * do Latin-1 — tentar escrever um deles quebra a geração. Troca aspas/traços
 * "tipográficos" comuns, tira acento do que tiver e descarta o resto.
 */
const WINANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
export function paraWinAnsi(texto: string): string {
  let out = "";
  for (const ch of texto.replace(/\r\n?/g, "\n")) {
    const code = ch.codePointAt(0)!;
    if (ch === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WINANSI_EXTRA.has(ch)) {
      out += ch;
      continue;
    }
    if (ch === "\t") {
      out += " ";
      continue;
    }
    const semAcento = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (semAcento && [...semAcento].every((c) => c.codePointAt(0)! <= 0x7e && c.codePointAt(0)! >= 0x20)) {
      out += semAcento;
    }
  }
  return out;
}
