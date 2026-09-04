/**
 * Suporte à trilha de auditoria (tela /logs). A captura em si é feita pela extensão
 * do Prisma Client em `src/lib/prisma.ts` — este arquivo só tem os rótulos e as
 * funções puras de normalização do payload. Nada aqui lê ou escreve no banco.
 */

export const AUDIT_WRITE_OPS = [
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
] as const;

/** Nome amigável de cada model do Prisma na tela de logs. */
export const MODULO_LABEL: Record<string, string> = {
  User: "Usuário",
  Paciente: "Paciente",
  Categoria: "Categoria",
  Exercicio: "Exercício",
  ExercicioLink: "Link de exercício",
  Movimento: "Movimento (goniometria)",
  Exame: "Modelo de exame",
  ExameSecao: "Seção de exame",
  ExameCampo: "Campo de exame",
  ExameCampoColuna: "Coluna de campo de exame",
  ExameExecucao: "Execução de exame",
  ExameExecucaoValor: "Valor de execução de exame",
  Evolucao: "Evolução",
  Cobranca: "Cobrança",
  Plano: "Plano",
  PlanoAtribuicao: "Atribuição de plano",
  Agendamento: "Agendamento",
  HorarioAtendimento: "Horário de atendimento",
  Treino: "Treino",
  TreinoDia: "Dia de treino",
  TreinoDiaExercicio: "Exercício de treino",
  AcessoCompartilhadoPaciente: "Link de acesso do paciente",
};

export const ACAO_LABEL: Record<string, string> = {
  create: "Criação",
  createMany: "Criação em lote",
  createManyAndReturn: "Criação em lote",
  update: "Atualização",
  updateMany: "Atualização em lote",
  upsert: "Criação/atualização",
  delete: "Exclusão",
  deleteMany: "Exclusão em lote",
};

export function moduloLabel(modulo: string) {
  return MODULO_LABEL[modulo] ?? modulo;
}

export function acaoLabel(acao: string) {
  return ACAO_LABEL[acao] ?? acao;
}

const CAMPOS_SIGILOSOS = new Set(["password", "senha", "hash"]);
const MAX_STRING = 1000;
const MAX_ARRAY = 100;

/** Deixa qualquer valor do Prisma serializável como JSON e sem dados sigilosos/gigantes. */
export function sanitizarValorAuditoria(valor: unknown, profundidade = 0): unknown {
  if (valor == null) return valor;
  if (profundidade > 6) return "[…]";

  if (typeof valor === "string") {
    return valor.length > MAX_STRING ? `${valor.slice(0, MAX_STRING)}…` : valor;
  }
  if (typeof valor === "number" || typeof valor === "boolean") return valor;
  if (typeof valor === "bigint") return valor.toString();
  if (valor instanceof Date) return valor.toISOString();

  // Prisma.Decimal e afins expõem toString/toNumber
  if (typeof valor === "object" && "toNumber" in valor && typeof valor.toNumber === "function") {
    return (valor as { toNumber: () => number }).toNumber();
  }
  if (Buffer.isBuffer?.(valor as Buffer)) return "[binário]";

  if (Array.isArray(valor)) {
    return valor
      .slice(0, MAX_ARRAY)
      .map((v) => sanitizarValorAuditoria(v, profundidade + 1));
  }

  if (typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(valor)) {
      if (CAMPOS_SIGILOSOS.has(chave)) {
        saida[chave] = "[oculto]";
        continue;
      }
      saida[chave] = sanitizarValorAuditoria(v, profundidade + 1);
    }
    return saida;
  }

  return String(valor);
}

/** Tenta achar um rótulo curto pro registro afetado (nome, título, etc.). */
export function rotuloDoRegistro(dados: unknown): string | null {
  if (!dados || typeof dados !== "object") return null;
  const d = dados as Record<string, unknown>;
  for (const chave of ["nome", "titulo", "name", "planoNome", "email"]) {
    const v = d[chave];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
