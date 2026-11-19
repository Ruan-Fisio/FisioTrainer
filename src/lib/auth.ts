import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registrarEvento } from "@/lib/metricas";
import { loginSchema } from "@/lib/validations/usuario";
import { authConfig } from "@/lib/auth.config";
import {
  POLITICAS,
  descreverEspera,
  ipDoCliente,
  normalizarEmail,
} from "@/lib/limite-tentativas";
import { contarTentativa, verificarBloqueio, zerarTentativas } from "@/lib/limite-tentativas-db";

/**
 * Login bloqueado por excesso de tentativas. O `code` volta para a action de login
 * (e vai para a URL no fluxo HTTP direto), então só carrega o tempo de espera.
 */
export class LoginBloqueadoError extends CredentialsSignin {
  constructor(restanteMs: number) {
    super();
    this.code = `bloqueado:${descreverEspera(restanteMs)}`;
  }
}

/**
 * Hash de uma senha aleatória, comparado quando o e-mail não existe: o tempo de
 * resposta fica igual ao de senha errada e não revela quais e-mails têm conta.
 */
const HASH_FICTICIO = bcrypt.hashSync(crypto.randomUUID(), 10);

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  events: {
    // Métrica de login (spec 001). Só aqui: `auth.config.ts` é edge-safe (proxy).
    async signIn({ user }) {
      await registrarEvento({
        area: "CLINICA",
        tipo: "ACAO",
        chave: "login",
        usuarioId: user?.id ?? null,
      });
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials, request) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const chaveEmail = `login-email:${normalizarEmail(email)}`;
        const chaveIp = `login-ip:${ipDoCliente(request.headers)}`;

        // IP: só consulta aqui; a contagem é das falhas, lá embaixo.
        const porIp = await verificarBloqueio(chaveIp);
        if (!porIp.permitido) throw new LoginBloqueadoError(porIp.restanteMs);

        // E-mail: toda tentativa reserva uma vaga ANTES de conferir a senha (incremento
        // atômico), então disparos em paralelo não escapam do limite.
        const porEmail = await contarTentativa(chaveEmail, POLITICAS.loginEmail);
        if (!porEmail.permitido) throw new LoginBloqueadoError(porEmail.restanteMs);

        const user = await prisma.user.findUnique({ where: { email } });
        const isValid = await bcrypt.compare(password, user?.password ?? HASH_FICTICIO);

        if (!user || !isValid) {
          const ip = await contarTentativa(chaveIp, POLITICAS.loginIp);
          if (!ip.permitido) throw new LoginBloqueadoError(ip.restanteMs);
          return null;
        }

        await zerarTentativas(chaveEmail);
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
