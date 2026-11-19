import { auth } from "@/lib/auth";
import { registrarEvento } from "@/lib/metricas";
import { normalizarRota } from "@/lib/metricas-rota";

/** Corpo esperado é `{"p":"/pacientes/abc"}` — qualquer coisa maior que isso é lixo. */
const MAX_BODY_BYTES = 1024;

/**
 * Beacon de page view (spec 001). Público por desenho: o portal e o pré-cadastro não têm
 * sessão. A ÁREA é derivada do pathname no servidor (nunca de campo do body) e CLINICA
 * sem sessão é descartada — não é rebaixada a PORTAL. Resposta sempre 204, sem eco, e
 * nenhuma falha de métrica vira erro (CA9).
 */
export async function POST(request: Request) {
  try {
    const texto = await request.text();
    if (texto.length > MAX_BODY_BYTES) return new Response(null, { status: 204 });

    const corpo = JSON.parse(texto) as { p?: unknown };
    const rota = normalizarRota(corpo?.p);
    if (!rota) return new Response(null, { status: 204 });

    let usuarioId: string | null = null;
    if (rota.area === "CLINICA") {
      const session = await auth();
      usuarioId = session?.user?.id ?? null;
      if (!usuarioId) return new Response(null, { status: 204 });
    }

    await registrarEvento({ area: rota.area, tipo: "TELA", chave: rota.chave, usuarioId });
  } catch {
    // métrica nunca quebra nada
  }
  return new Response(null, { status: 204 });
}
