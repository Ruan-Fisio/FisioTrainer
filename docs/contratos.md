# Contratos e assinatura eletrônica

Atribuir ou renovar um plano gera um contrato. A clínica envia o link, o paciente confirma o CPF, lê, desenha a assinatura e baixa o PDF. Aba **Contratos** do menu: `?tab=lista` (acompanhamento) e `?tab=modelo` (texto editável).

## Decisões do usuário

- Modelo único, editável no app. Só o paciente assina; a clínica entra com os dados do cadastro, sem assinatura.
- Identificação por **CPF + assinatura desenhada**, sem envio de código.
- Geração automática, **sem bloquear agendamentos**. Plano antigo ou reativado tem o botão "Gerar contrato" no card do plano.
- O texto sugerido é um rascunho (`CONTRATO_MODELO_PADRAO`), que precisa de revisão jurídica.

## Ciclo de vida

`Contrato.status`: `PENDENTE` → `ASSINADO` → `SUBSTITUIDO`, ou `PENDENTE` → `CANCELADO`.

- **Pendente não guarda texto**: é renderizado na hora (`renderizarContratoPendente`), com modelo, plano e cadastro atuais. Corrigir um dado não exige gerar nada de novo.
- **Assinar congela** `conteudo`, hashes, versão do modelo, evidências e PDF. O assinado nunca é re-renderizado.
- O paciente assina exatamente o que leu: `assinarContrato` recalcula o hash e recusa se for diferente do que a página recebeu.
- `sincronizarContratoDoPlano` roda ao criar, editar ou renovar a atribuição. Assinado só vira `SUBSTITUIDO` (com novo pendente) se mudarem as variáveis `plano.*` (`hashDadosPlano`), nunca por mudança de cadastro do paciente.
- Cancelar o plano cancela o pendente; o assinado continua como registro.

## Segurança da página pública

`/compartilhado/contrato/[token]` (token de 256 bits, público pelo prefixo `/compartilhado` no `proxy.ts`).

- **Nada do contrato sai antes de conferir o CPF**: o texto traz o CPF, então mostrá-lo antes anularia a verificação. Sem confirmação, a página mostra só primeiro nome, número e nome do plano.
- `src/actions/portal-contratos.ts` confere o CPF em toda chamada. Cinco erros travam o link por 15 minutos (`estadoAposFalhaCpf`).
- **Bloqueiam a assinatura**: paciente sem CPF, clínica sem CPF/CNPJ. Os demais campos vazios saem como `[não informado]`.
- O catálogo não tem variável de créditos de remarcação: o paciente nunca vê esse dado.

## Modelo

- `ContratoModelo` só acrescenta linhas; a maior `versao` vale. Sem nenhuma salva, vale o texto sugerido (versão 0), então o banco não precisa de seed.
- Marcação: `# ` título, `## ` seção, linha em branco separa parágrafos (`blocosContrato`, a mesma na tela e no PDF).
- Variáveis: catálogo em `GRUPOS_VARIAVEIS` (`src/lib/contrato-modelo.ts`). Variável nova → incluir no catálogo e em `montarVariaveisContrato`. Salvar recusa variável desconhecida.
- A contratada vem de um usuário com CPF/CNPJ, escolhido no modelo. Sem escolha, usa o primeiro usuário com CPF/CNPJ.

## PDF e armazenamento

- `src/lib/pdf/contrato-documento.tsx`: texto, assinatura e página de evidências (CPF, data e hora, IP, navegador, SHA-256 do texto). `pdfHash` no banco é o SHA-256 do arquivo.
- R2 em `pacientes/{id}/contratos/{contratoId}-{envio}.pdf`. Excluir o paciente não apaga o contrato (exclusão lógica, ver `docs/ops.md`): o assinado continua em `/contratos` e no R2, e o link público deixa de abrir. `envio` é único por tentativa para um envio duplicado não sobrescrever o PDF registrado.
- Paciente baixa por URL assinada (funciona no navegador interno do WhatsApp); equipe abre por `/api/contratos/[id]/pdf`, que exige sessão.
- Gotcha do react-pdf: `lineHeight` herdado da página faz sumir o `Text` com `render` (rodapé). Manter nos estilos de texto.

## Testes

- Unitários: `contrato-regras.test.ts`, `contrato-modelo.test.ts`, `cpf.test.ts`.
- E2E: `e2e/tests/contratos.spec.ts`. `CONTRATOS_STORAGE_DIR` (definida só no `playwright.config.ts` e ignorada em produção) grava os PDFs em `test-results/contratos`, nunca no bucket real.
