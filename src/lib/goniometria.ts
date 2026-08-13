export type MovimentoGrauEntry = {
  nome: string;
  grauAlcancado: string;
};

export function parseGoniometriaValor(valor: string): MovimentoGrauEntry[] {
  if (!valor) return [];
  try {
    const parsed = JSON.parse(valor);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is MovimentoGrauEntry =>
        !!item && typeof item.nome === "string",
    );
  } catch {
    return [];
  }
}
