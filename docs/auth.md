# Autenticação e autorização

## Login
- NextAuth v5, Credentials + JWT. Config edge-safe em `src/lib/auth.config.ts` (usada por `src/proxy.ts`); provider e Prisma em `src/lib/auth.ts`. **Nunca importar `auth.ts` no proxy.**
- Login (`loginAction`): valida e-mail/senha com bcrypt; compara contra hash fictício quando o usuário não existe (evita enumeração por tempo).
- **Limite de tentativas** (`src/lib/limite-tentativas*.ts`, model `LimiteTentativa`): por e-mail (reserva a vaga antes de conferir a senha, incremento atômico) e por IP (conta só falhas). Estourou → `LoginBloqueadoError` com tempo restante.

## Proxy (`src/proxy.ts`)
- Sem sessão → redireciona para `/login`. Logado em `/login` → `/dashboard`.
- `/compartilhado*` e `/pre-cadastro*` passam sem sessão. `/api` fica fora do matcher: cada route handler chama `auth()` e responde 401.
- **O proxy não protege server actions** (qualquer rota aceita o POST com `Next-Action`).

## Server actions (`src/lib/sessao.ts`)
- Toda action exportada de `src/actions/` começa com `await exigirSessao()` (confere o usuário no banco, uma vez por request; JWT de usuário excluído deixa de valer). Exceções por desenho, que validam por conta própria: login, portal por token, pré-cadastro, assinatura de contrato.
- `exigirSessaoOuPortal(pacienteId?)`: para actions que o portal também usa. Libera se o contexto do portal (`comAcessoPortal`, aberto só em código de servidor após validar o token) for do **mesmo** paciente; senão exige sessão da clínica.
- Action nova → `exigirSessao()` na primeira linha. Route handler novo → `auth()` + 401.

## Usuários
- CRUD em `/usuarios` (`src/actions/usuarios.ts`). Campos profissionais: `cref`, `crefito`, `cpfCnpj` (chave Pix), `atendeFisioterapia`, `atendeEducacaoFisica` (filtram profissional de agendamento; ver `docs/agenda-salas-servicos.md`).
- Seed: `admin@admin.com` / `admin` (`docs/ops.md`).
