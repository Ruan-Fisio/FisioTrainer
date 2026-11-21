# 000 — Mapa do sistema atual
Base para specs futuras. Só o que já existe.

| Área | Rotas/módulos principais | Doc |
|---|---|---|
| Usuários / modalidades | `(app)/usuarios`, `(app)/configuracoes` | `docs/auth.md`, `docs/agenda-salas-servicos.md` |
| Biblioteca de exercícios | `(app)/biblioteca` (categorias, exercicios), `compartilhado/exercicios` | `docs/biblioteca.md` |
| Biblioteca de movimento | `(app)/biblioteca-movimento/goniometria` | `docs/biblioteca-movimento.md` |
| Exames | `(app)/exames`, `pacientes/[id]/exames` | `docs/exames.md` |
| Pacientes | `(app)/pacientes`, `pacientes/[id]` (editar, evolucoes, treinos) | `docs/ops.md` (exclusão lógica) |
| Treinos / evoluções | `(app)/treinos`, `(app)/evolucoes`, `api/evolucoes`, `api/execucoes`, `compartilhado/treinos` | `docs/treinos-evolucoes.md` |
| Planos, agendamento, parcelamento | `(app)/planos`, `pacientes/[id]/planos`, `api/plano-atribuicoes` | `docs/agendamento-planos.md` |
| Agenda, salas, serviços | `(app)/agenda`, `(app)/servicos` | `docs/agenda-salas-servicos.md` |
| Financeiro / cobranças | `(app)/cobrancas`, `pacientes/[id]/cobrancas` | `docs/financeiro.md` |
| Dashboard e despesas | `(app)/dashboard`, `dashboard/despesas` | `docs/dashboard-portal.md` |
| Portal público do paciente | `compartilhado/paciente/[token]` | `docs/dashboard-portal.md` |
| Pré-cadastro e curadoria | `pre-cadastro`, `(app)/curadoria` | `docs/pre-cadastro.md` |
| Contratos e assinatura | `(app)/contratos`, `compartilhado/contrato/[token]`, `api/contratos` | `docs/contratos.md` |
| Documentos do paciente | `pacientes/[id]/documentos`, `api/documentos` | `docs/documentos.md` |
| Auditoria / logs | `(app)/logs`, `src/lib/audit.ts` | `docs/ops.md` |
| Auth | `(auth)`, `api/auth`, `src/proxy.ts`, `src/lib/auth*.ts`, `sessao.ts` | `docs/auth.md` |
| Datas e fuso | `src/lib/format.ts`, `datas-brasilia.ts` | `docs/fuso-horario.md` |
| Testes | `src/**/*.test.ts`, `e2e/` | `docs/testes.md` |
