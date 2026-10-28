/**
 * Trava otimista da edição de exame. O form guarda o `updatedAt` do exame no
 * momento em que a tela foi aberta. Ao salvar, se o exame mudou desde então
 * (outra pessoa salvou ou virou versão antiga), nada é gravado: o form envia o
 * exame inteiro e sobrescreveria o que o outro gravou (ex. tabelas de
 * referência criadas em paralelo). A edição em tempo real então sincroniza,
 * mescla (exame-merge.ts) e tenta de novo.
 */

/** Lê o `updatedAt` (ISO) enviado pelo form; ausente/inválido = `null`. */
export function parseCarregadoEm(valor: FormDataEntryValue | null): Date | null {
  if (typeof valor !== "string" || !valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * `true` quando o exame não pode ser salvo a partir do form carregado em
 * `carregadoEm`. Sem `carregadoEm` (form antigo em cache durante um deploy)
 * só a versão arquivada é barrada.
 */
export function exameAlteradoDesde(
  atual: { versaoAtual: boolean; updatedAt: Date } | null,
  carregadoEm: Date | null,
): boolean {
  if (!atual || !atual.versaoAtual) return true;
  if (!carregadoEm) return false;
  return atual.updatedAt.getTime() !== carregadoEm.getTime();
}

/** Erro do Prisma "registro não encontrado" — o `where` com `updatedAt` não bateu. */
export function ehRegistroNaoEncontrado(erro: unknown): boolean {
  return (
    typeof erro === "object" &&
    erro !== null &&
    (erro as { code?: unknown }).code === "P2025"
  );
}
