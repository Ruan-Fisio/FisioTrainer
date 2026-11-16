/**
 * Controle de força bruta — regras puras (sem banco). A persistência fica em
 * `limite-tentativas-db.ts`; aqui só se decide, a partir do estado do contador,
 * se a próxima tentativa passa e quando bloquear.
 *
 * Modelo: janela fixa de `janelaMs`; ao passar de `maxTentativas` dentro da janela, a
 * chave fica bloqueada por `bloqueioMs`, dobrando a cada novo bloqueio (até
 * `bloqueioMaxMs`). Um dia sem atividade zera o histórico de bloqueios.
 */

export type PoliticaLimite = {
  maxTentativas: number;
  janelaMs: number;
  bloqueioMs: number;
  bloqueioMaxMs: number;
};

export type EstadoLimite = {
  tentativas: number;
  janelaInicio: Date;
  bloqueadoAte: Date | null;
  bloqueios: number;
};

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
export const ESQUECER_BLOQUEIOS_APOS_MS = 24 * HORA;

export const POLITICAS = {
  /** Por e-mail: conta TODA tentativa (reservada antes de conferir a senha); zera no sucesso. */
  loginEmail: { maxTentativas: 5, janelaMs: 15 * MINUTO, bloqueioMs: 15 * MINUTO, bloqueioMaxMs: 24 * HORA },
  /** Por IP: conta só falhas — barra quem testa muitas contas a partir do mesmo endereço. */
  loginIp: { maxTentativas: 20, janelaMs: 15 * MINUTO, bloqueioMs: 15 * MINUTO, bloqueioMaxMs: 24 * HORA },
  /** Por IP: tokens inválidos do portal / links públicos (varredura de tokens). */
  tokenPublicoIp: { maxTentativas: 20, janelaMs: 15 * MINUTO, bloqueioMs: HORA, bloqueioMaxMs: 24 * HORA },
  /** Por IP: envios do formulário público de pré-cadastro (spam). */
  preCadastroIp: { maxTentativas: 10, janelaMs: HORA, bloqueioMs: HORA, bloqueioMaxMs: 24 * HORA },
  /** Por IP: URLs de upload do pré-cadastro (abuso de armazenamento). */
  uploadPreCadastroIp: { maxTentativas: 40, janelaMs: HORA, bloqueioMs: HORA, bloqueioMaxMs: 24 * HORA },
} satisfies Record<string, PoliticaLimite>;

/** Bloqueio ainda vigente? Devolve quanto falta (ms) ou 0. */
export function tempoRestanteBloqueio(estado: Pick<EstadoLimite, "bloqueadoAte"> | null, agora: Date) {
  if (!estado?.bloqueadoAte) return 0;
  return Math.max(0, estado.bloqueadoAte.getTime() - agora.getTime());
}

export function janelaExpirada(estado: Pick<EstadoLimite, "janelaInicio">, politica: PoliticaLimite, agora: Date) {
  return agora.getTime() - estado.janelaInicio.getTime() >= politica.janelaMs;
}

/** Duração do próximo bloqueio: dobra a cada bloqueio anterior, com teto. */
export function duracaoBloqueio(bloqueiosAnteriores: number, politica: PoliticaLimite) {
  const fator = 2 ** Math.min(Math.max(bloqueiosAnteriores, 0), 20);
  return Math.min(politica.bloqueioMs * fator, politica.bloqueioMaxMs);
}

/**
 * Estado antes de contar uma nova tentativa: janela vencida recomeça do zero, e um dia
 * inteiro sem atividade esquece os bloqueios anteriores (o progressivo volta ao início).
 */
export function normalizarEstado(
  estado: EstadoLimite | null,
  politica: PoliticaLimite,
  agora: Date,
): EstadoLimite {
  if (!estado) return { tentativas: 0, janelaInicio: agora, bloqueadoAte: null, bloqueios: 0 };
  if (tempoRestanteBloqueio(estado, agora) > 0) return estado;
  if (!janelaExpirada(estado, politica, agora)) return { ...estado, bloqueadoAte: null };
  const ocioso = agora.getTime() - estado.janelaInicio.getTime() >= ESQUECER_BLOQUEIOS_APOS_MS;
  return {
    tentativas: 0,
    janelaInicio: agora,
    bloqueadoAte: null,
    bloqueios: ocioso ? 0 : estado.bloqueios,
  };
}

/**
 * Decide sobre o estado JÁ com a tentativa atual contada (`tentativas` incluído).
 * Passou do limite → bloqueia (e zera a janela, que recomeça quando o bloqueio acabar).
 */
export function decidirAposContar(
  estado: EstadoLimite,
  politica: PoliticaLimite,
  agora: Date,
): { permitido: boolean; novoEstado: EstadoLimite | null; restanteMs: number } {
  const restante = tempoRestanteBloqueio(estado, agora);
  if (restante > 0) return { permitido: false, novoEstado: null, restanteMs: restante };
  if (estado.tentativas <= politica.maxTentativas) {
    return { permitido: true, novoEstado: null, restanteMs: 0 };
  }
  const duracao = duracaoBloqueio(estado.bloqueios, politica);
  return {
    permitido: false,
    restanteMs: duracao,
    novoEstado: {
      tentativas: 0,
      janelaInicio: agora,
      bloqueadoAte: new Date(agora.getTime() + duracao),
      bloqueios: estado.bloqueios + 1,
    },
  };
}

/** "15 minutos", "1 hora", "2 horas"… (arredonda pra cima). */
export function descreverEspera(ms: number) {
  const minutos = Math.max(1, Math.ceil(ms / MINUTO));
  if (minutos < 60) return `${minutos} minuto${minutos === 1 ? "" : "s"}`;
  const horas = Math.ceil(minutos / 60);
  return `${horas} hora${horas === 1 ? "" : "s"}`;
}

/**
 * IP do cliente para chave de limite. Atrás da Vercel (e de proxies bem configurados)
 * `x-real-ip`/`x-forwarded-for` são escritos pela borda e não podem ser forjados; em
 * hospedagem sem proxy, o IP é só uma camada extra — o limite por e-mail vale sempre.
 */
export function ipDoCliente(cabecalhos: { get(nome: string): string | null }) {
  const real = cabecalhos.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const encaminhado = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (encaminhado || "desconhecido").slice(0, 64);
}

/** E-mail normalizado pra chave (o mesmo endereço com outra caixa conta junto). */
export function normalizarEmail(email: string) {
  return email.trim().toLowerCase().slice(0, 254);
}
