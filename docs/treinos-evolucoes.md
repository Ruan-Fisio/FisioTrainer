# Treinos e Evoluções

## Treinos
- **Modelo** (`Treino.pacienteId = null`): cadastrado em `/treinos` (CRUD, filtro `q`). **Treino do paciente**: cópia de um modelo, com `pacienteId` e `treinoOrigemId`.
- Estrutura: `Treino → TreinoDia (diaSemana, ordem) → TreinoDiaExercicio (exercicioId, ordem, series, repeticoes, carga, descanso, instrucoes)`.
- Validação em `src/lib/validations/treino.ts`: nome ≥ 2 caracteres, descrição ≤ 280, ≥ 1 dia, ≥ 1 exercício por dia. O form envia `dias` como JSON em `FormData`.
- **Atribuir** (`assignTreino` em `src/actions/treinos.ts`): copia um ou mais **modelos** (`pacienteId: null`) para o paciente numa `$transaction`, com `dataInicio`/`dataFim` opcionais. A cópia é independente: editar o modelo depois não altera o treino já atribuído.
- **Editar** (`updateTreino`, `updateTreinoPaciente`): usa `updateTreinoInPlace` (`src/lib/treino-persistence.ts`). Mantém os ids de dia e exercício existentes e apaga só o que o usuário removeu. É um único nested write do Prisma, **sem transação interativa** (estourava o timeout de 5s do pooler Neon, P2028). Não trocar por `$transaction` interativa.
- Treino do paciente (`src/actions/treinos-paciente.ts`): todas as actions conferem `treino.pacienteId === pacienteId`.
  - `desativarTreinoPaciente` põe `ativo = false` e o treino some das listagens e do portal.
  - `deleteTreinoPaciente` apaga de verdade.
- Treino do paciente fica em `/pacientes/[id]/treinos` (aba do paciente). Execuções de exercício não são registradas.
- Portal: `/compartilhado/treinos/[pacienteId]` lista só `ativo = true` de paciente `PACIENTE_ATIVO`. `/compartilhado/exercicios/[id]` mostra um exercício com previews dos links. Ver "Atenção" abaixo.

## Evoluções
- Registro clínico do paciente (`Evolucao`): `hdp`, `hda`, `pa`, `fc`, `spo2`, `fr`, `temperatura`, `auscultaPulmonar` (opcional), `evolucao`, `conduta`. Todos obrigatórios (texto livre) exceto `auscultaPulmonar` (`src/lib/validations/evolucao.ts`).
- O profissional é o usuário logado, resolvido por e-mail da sessão no `createEvolucao`. `data` é o `@default(now())` do banco; o form não a edita.
- Rotas: listagem geral `/evolucoes` (filtros na URL: `pacientes`, `profissionais`, `de`, `ate`; padrão = últimos 30 dias; só pacientes `PACIENTE_ATIVO`). Criar/ver/editar em `/pacientes/[id]/evolucoes/...`.
- PDF individual: `GET /api/evolucoes/[evolucaoId]/relatorio` (exige sessão; usa CREF/CREFITO do profissional via `src/lib/pdf/evolucao-documento.tsx`).
- `revalidatePath` em toda escrita: `/pacientes/[id]` e `/evolucoes`.

## Atenção (pontos a rever)
- `/compartilhado/treinos/[pacienteId]` e `/compartilhado/exercicios/[id]` são públicos e identificados por **id cru** (cuid), sem token de `AcessoCompartilhadoPaciente`, diferente do portal `/compartilhado/paciente/[token]` (ver `docs/dashboard-portal.md`). Quem tiver o link acessa; revogar não é possível.
- `createEvolucao` usa `SEM_USUARIO_ID = "sem-usuario"` quando o e-mail da sessão não resolve usuário. `Evolucao.profissionalId` tem FK para `User`, então esse fallback falharia no banco. Na prática `exigirSessao()` já garante usuário; o fallback é código morto.
