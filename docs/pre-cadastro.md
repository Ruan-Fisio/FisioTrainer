# Pré-cadastro e Fila de Curadoria

Fluxo: formulário público `/pre-cadastro` → `PreCadastro` (PENDENTE) → `/curadoria` → **aprovar** (vira `Paciente`) ou **rejeitar** (histórico).

## Regras
- `/pre-cadastro` é rota pública (`src/proxy.ts`); `/curadoria` exige login. `criarPreCadastro` (`src/actions/pre-cadastros.ts`) é a única action sem sessão — não adicionar outras.
- Campos: nome, sobrenome, celular (máscara `mascararCelular`, gravado só com dígitos, validado por `celularValido`), queixa principal (até **2000 palavras**, `contarPalavras`). Anexos de fotos/exames: desabilitado, "EM BREVE".
- Celular/palavras/schema: lógica pura em `src/lib/telefone.ts`, `src/lib/texto.ts`, `src/lib/validations/pre-cadastro.ts` (com testes).
- Fila de pendentes ordenada por chegada (mais antigo primeiro); abas via URL `?status=pendentes|rejeitados|aprovados`.
- **Aprovar** = link para `/pacientes/novo?preCadastro=<id>` (form pré-preenchido: queixa vai para Histórico Clínico). `createPaciente` recebe `preCadastroId` (hidden) e, numa transação, cria o paciente e marca APROVADO com `pacienteId`. O form congela o id em `useState` porque o re-render pós-criação já não encontra o pré-cadastro pendente.
- **Rejeitar** = dialog com motivo opcional (≤ 500); só atua em PENDENTE (`updateMany` com `status`).
- Sem anti-spam por enquanto (decisão do usuário); se virar problema: honeypot + limite por IP.
- O form público não usa `FormActions` (ele assume o sidebar).

## Testes
`e2e/tests/pre-cadastro.spec.ts`: envio público sem login, máscara/validação, login exigido em `/curadoria`, aprovar e rejeitar.
