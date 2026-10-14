// Cor de destaque de uma opção de MULTIPLA_ESCOLHA: quando a opção é marcada
// (manual ou automaticamente por fórmula), ela aparece destacada nessa cor.
// Persistido em `ExameCampoColuna.coresOpcoes` (`Json`: `{opcao, cor}[]`);
// opção sem entrada = sem destaque. Paleta propositalmente fechada.

// Ordem = escala de "melhor" para "pior" (azul → vermelho); é a ordem do seletor.
export const CORES_OPCAO = [
  "AZUL",
  "VERDE",
  "AMARELO",
  "LARANJA",
  "VERMELHO",
] as const;
export type CorOpcao = (typeof CORES_OPCAO)[number];

export type OpcaoColorida = { opcao: string; cor: CorOpcao };

export const COR_OPCAO_LABEL: Record<CorOpcao, string> = {
  AZUL: "Azul",
  VERDE: "Verde",
  AMARELO: "Amarelo",
  LARANJA: "Laranja",
  VERMELHO: "Vermelho",
};

/** Classes completas (Tailwind só gera classe escrita por extenso). */
export const COR_OPCAO_CLASSES: Record<
  CorOpcao,
  { destaque: string; ponto: string }
> = {
  AZUL: {
    destaque:
      "border-blue-500/50 bg-blue-500/15 text-blue-800 dark:text-blue-200",
    ponto: "bg-blue-500",
  },
  VERDE: {
    destaque:
      "border-green-500/50 bg-green-500/15 text-green-800 dark:text-green-200",
    ponto: "bg-green-500",
  },
  AMARELO: {
    destaque:
      "border-yellow-500/60 bg-yellow-400/20 text-yellow-900 dark:text-yellow-100",
    ponto: "bg-yellow-400",
  },
  LARANJA: {
    destaque:
      "border-orange-500/50 bg-orange-500/15 text-orange-800 dark:text-orange-200",
    ponto: "bg-orange-500",
  },
  VERMELHO: {
    destaque:
      "border-red-500/50 bg-red-500/15 text-red-800 dark:text-red-200",
    ponto: "bg-red-500",
  },
};

export function ehCorOpcao(valor: unknown): valor is CorOpcao {
  return (
    typeof valor === "string" && (CORES_OPCAO as readonly string[]).includes(valor)
  );
}

/** `coresOpcoes` vem do Prisma como `Json` (`unknown` pro TS) — normaliza,
 * tratando null/formato inesperado/cor desconhecida como "sem destaque". */
export function parseCoresOpcoes(valor: unknown): OpcaoColorida[] {
  if (!Array.isArray(valor)) return [];
  const resultado: OpcaoColorida[] = [];
  for (const item of valor) {
    if (typeof item !== "object" || item === null) continue;
    const { opcao, cor } = item as { opcao?: unknown; cor?: unknown };
    if (typeof opcao === "string" && ehCorOpcao(cor)) resultado.push({ opcao, cor });
  }
  return resultado;
}

/** Opção → cor, pronto pra consulta na hora de renderizar. */
export function mapaCoresOpcoes(valor: unknown): Map<string, CorOpcao> {
  return new Map(parseCoresOpcoes(valor).map((c) => [c.opcao, c.cor]));
}

/**
 * Do formato do formulário (array de cores alinhado por índice com `opcoes`,
 * `""` = sem cor) para o formato persistido. Cor inválida e opção vazia são
 * descartadas; opção repetida fica com a primeira cor.
 */
export function coresAlinhadasParaPersistir(
  opcoes: string[],
  cores: string[],
): OpcaoColorida[] {
  const vistos = new Set<string>();
  const resultado: OpcaoColorida[] = [];
  opcoes.forEach((opcao, i) => {
    const cor = cores[i];
    if (!opcao || vistos.has(opcao) || !ehCorOpcao(cor)) return;
    vistos.add(opcao);
    resultado.push({ opcao, cor });
  });
  return resultado;
}

/** Inverso de `coresAlinhadasParaPersistir`: array alinhado com `opcoes`. */
export function coresPersistidasParaAlinhar(
  opcoes: string[],
  valor: unknown,
): string[] {
  const mapa = mapaCoresOpcoes(valor);
  return opcoes.map((opcao) => mapa.get(opcao) ?? "");
}
