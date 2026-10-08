# Pré-cadastro e Fila de Curadoria

Fluxo: formulário público `/pre-cadastro` → `PreCadastro` (PENDENTE) → `/curadoria` → **aprovar** (vira `Paciente`) ou **rejeitar** (histórico).

## Regras
- `/pre-cadastro` é rota pública (`src/proxy.ts`); `/curadoria` exige login. As únicas actions sem sessão são `criarPreCadastro` e `solicitarUploadPreCadastro` (`src/actions/pre-cadastros.ts`) — não adicionar outras.
- Campos: nome, sobrenome, celular (máscara `mascararCelular`, gravado só com dígitos, validado por `celularValido`), queixa principal (até **2000 palavras**, `contarPalavras`). Anexos de fotos/exames: até 5 arquivos de 15 MB, qualquer tipo exceto executáveis/scripts (ver `docs/exames.md`).
- Celular/palavras/schema: lógica pura em `src/lib/telefone.ts`, `src/lib/texto.ts`, `src/lib/validations/pre-cadastro.ts` (com testes).
- Fila de pendentes ordenada por chegada (mais antigo primeiro); abas via URL `?status=pendentes|rejeitados|aprovados`.
- **Aprovar** = link para `/pacientes/novo?preCadastro=<id>` (form pré-preenchido: queixa vai para Histórico Clínico). `createPaciente` recebe `preCadastroId` (hidden) e, numa transação, cria o paciente e marca APROVADO com `pacienteId`. O form congela o id em `useState` porque o re-render pós-criação já não encontra o pré-cadastro pendente.
- **Rejeitar** = dialog com motivo opcional (≤ 500); só atua em PENDENTE (`updateMany` com `status`).
- **Anexos (R2):** upload imediato do navegador para `tmp/pre-cadastro/{sessaoUuid}/` via URL assinada (5 min, `Content-Length` assinado, então o R2 recusa tamanho diferente; `ArquivosUpload`). O submit leva só o JSON `arquivos` + `sessaoUpload`; `criarPreCadastro` confere cada objeto (`HEAD`), copia para `pre-cadastro/{id}/` e grava `PreCadastroArquivo`. Abandonados expiram em 1 dia (regra de `tmp/`). Cada entrada da curadoria tem o botão **Visualizar** (`pre-cadastro-visualizar-dialog.tsx`): dados completos + visualizador dos anexos (imagem, PDF, vídeo e áudio abrem ali via `tipoPreview`, com anterior/próximo e miniaturas; os demais tipos só baixam). URLs assinadas de curta duração. **Rejeitar** apaga os anexos (banco + R2); `deletePaciente` apaga os do pré-cadastro de origem. Em produção, a URL do site precisa estar no CORS do bucket (`scripts/r2-setup.ts <url>`).
- Sem anti-spam por enquanto (decisão do usuário); se virar problema: honeypot + limite por IP.
- O form público não usa `FormActions` (ele assume o sidebar).

## Testes
`e2e/tests/pre-cadastro.spec.ts`: envio público sem login, máscara/validação, login exigido em `/curadoria`, aprovar e rejeitar.
