# Financeiro (cobranças)

Complementa `docs/agendamento-planos.md` (geração de parcelas) e `docs/dashboard-portal.md` (dashboard e despesas).

## Cobrança
- `Cobranca`: `valorBase` (sem taxa), `valor` (final), `vencimento`, `status` (`PENDENTE` | `PAGO`), `pagoEm`, `numeroParcela/totalParcelas`, `notaFiscal`, `taxaProfissional`, e **no máximo um** vínculo: `planoAtribuicaoId` (plano) **ou** `servicoId` (serviço avulso). Sem nenhum dos dois = cobrança avulsa manual.
- **Nota fiscal**: `valor = aplicarTaxaNotaFiscal(valorBase, notaFiscal)` → +7% (`TAXA_NOTA_FISCAL`, `src/lib/planos.ts`). Em cobrança manual o `valor` do form é o `valorBase`.
- **Taxa de parcelamento no cartão**: percentual em `ConfiguracaoTaxa` (chave `PARCELAMENTO_CARTAO`, padrão 2,3 se a linha não existir). Editável em `/configuracoes` (`updateConfiguracaoTaxa`).
- **Taxa do profissional** (`taxaProfissional`): snapshot em R$ de `Servico.taxaProfissionalPercentual` na criação (`calcularTaxaProfissional`); só informativo para o dashboard, nunca recalculado.
- Marcar paga (`marcarCobrancaPaga`) grava `pagoEm`. Criar já como `PAGO` também grava `pagoEm = now`.
- Toda escrita faz `revalidatePath` de `/pacientes/[id]`, `/dashboard` e `/cobrancas`.

## Telas
- `/cobrancas`: pendentes de **todos** os pacientes ativos (`PACIENTE_ATIVO`), por vencimento. Mostra o CPF/CNPJ do profissional logado como chave Pix (`User.cpfCnpj`) e contato do paciente (WhatsApp, `src/lib/whatsapp.ts`).
- `/pacientes/[id]/cobrancas/novo` e `.../[cobrancaId]/editar`; listagem na ficha do paciente.
- Paciente no portal vê suas cobranças via `getCobrancasByPaciente` (`exigirSessaoOuPortal(pacienteId)`).
- Comprovante em PDF: `GET /api/plano-atribuicoes/[id]/comprovante`.

## Análise financeira (dashboard)
- `analisarFinanceiro(linhas, agora)` em `src/lib/financeiro.ts`: lógica pura, testada em `financeiro.test.ts`. Recebe `CobrancaLinha[]` já lida do banco.
- Receita realizada = cobranças **pagas**, agrupadas pelo mês de `pagoEm`. A receber = pendentes por mês de vencimento (6 meses à frente).
- Categoria (`categoriaReceita`): `servicoId` → Serviço; sem plano nem serviço → Avulso; 1 tipo de plano → esse tipo; ≥ 2 → Combinado.
- Bucketing mensal sempre no fuso da clínica (`docs/fuso-horario.md`), nunca `getMonth()`.

## Atenção
- `src/lib/validations/cobranca.ts` converte `vencimento` com `new Date(`${v}T12:00:00`)`: `T12:00` evita virar o dia em UTC-3, mas é exatamente a construção que o `docs/fuso-horario.md` proíbe (sem offset). Preferir `combinarDataHora`; não alterar sem teste.
