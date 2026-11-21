# 002 — Assinatura do profissional nos documentos
Status: implementado

## Spec
### Problema
Os documentos do paciente (encaminhamentos, atestados, relatórios…) saem em PDF sem assinatura. O profissional precisa imprimir, assinar e digitalizar. Ele quer cadastrar a assinatura uma vez, desenhando na tela ou enviando uma foto, para que todo documento emitido já saia assinado.

### Critérios de aceite
- **CA1** Dado o profissional logado na própria tela de usuário (`/usuarios/[id]` com `id` = ele), quando desenha a assinatura no campo e salva, então ela passa a aparecer como "assinatura atual", com uma prévia. Funciona em 375px, desenhando com o dedo.
- **CA2** Dado o mesmo cenário, quando envia uma foto da assinatura feita no papel, então a prévia mostra a assinatura recortada e com o fundo transparente. Depois de salvar, ela vira a assinatura atual. No celular, o campo de arquivo permite tirar a foto na hora.
- **CA3** Dado um usuário que abre a tela de **outro** usuário, então o bloco de assinatura não aparece, e a action recusa a gravação mesmo se for chamada direto.
- **CA4** Dado um profissional com assinatura cadastrada, quando emite um documento de qualquer tipo, exceto encaminhamento multiprofissional e solicitação de exames (RN9), então o PDF (equipe e portal) traz a imagem da assinatura acima do nome impresso, na linha do profissional e nunca na do paciente.
- **CA5** Dado um documento já emitido, quando o profissional troca ou remove a assinatura cadastrada, então o PDF desse documento continua com a assinatura da época da emissão. Editar os campos do documento também não troca a assinatura. Excluir o usuário também não.
- **CA6** Dado um profissional sem assinatura cadastrada, quando emite um documento, então o PDF sai como hoje (sem assinatura). A aba Documentos e a tela `/pacientes/[id]/documentos/novo` mostram um aviso com o link "Cadastrar minha assinatura".
- **CA7** ~~Colunas do encaminhamento por modalidade~~ — removido na implementação (ver RN9).
- **CA10** Dado um encaminhamento multiprofissional ou uma solicitação de exames, quando são emitidos por quem tem assinatura, então o PDF sai igual ao de hoje, só com o carimbo/assinatura do modelo, e o documento não grava `assinaturaId`.
- **CA8** Dado o profissional na própria tela, quando clica em "Remover assinatura" e confirma, então os próximos documentos saem sem assinatura (CA5 vale para os antigos).
- **CA9** Dado o envio de foto, quando o arquivo não é imagem, passa de 10 MB, está num formato que o navegador não consegue ler (ex.: HEIC fora do Safari) ou fica vazio depois da limpeza do fundo, então aparece uma mensagem de erro visível e o botão Salvar fica desabilitado.

### Regras de negócio
- **RN1** Quem assina é sempre o **autor** do documento (`DocumentoPaciente.autorId`). Não há escolha de outro profissional.
- **RN2** Todo documento emitido por quem tem assinatura sai assinado. Não há opção por documento.
- **RN3** A assinatura é **congelada na emissão**. O documento guarda a versão vigente no `criarDocumento`. `atualizarDocumento` não mexe nela.
- **RN4** As versões são só acrescentadas. Trocar a assinatura cria uma versão nova, e remover só desvincula a atual do usuário. Nenhuma versão é apagada, nem quando o usuário é excluído (ela fica sem dono, mas os documentos continuam apontando para ela).
- **RN5** Só o próprio usuário cadastra, troca ou remove a própria assinatura. A action confere `sessão.id === userId`.
- **RN6** Formato gravado: PNG com fundo transparente, no máximo 900×300 px e 300 KB. O server confere o cabeçalho e o tamanho (`decodificarAssinaturaPng`) e as dimensões (lidas do IHDR). A foto é tratada no client (o fundo claro vira transparente e as bordas vazias são recortadas). O server só aceita o PNG final.
- **RN7** Documentos emitidos antes desta feature continuam sem assinatura.
- **RN8** Dados binários (incluindo os bytes da assinatura) nunca entram no log de auditoria.
- **RN9** Os modelos de encaminhamento multiprofissional e de solicitação de exames já trazem, embutidos no PDF, o carimbo e a assinatura do Ruan. Esses dois tipos não têm caixa de assinatura e nunca recebem a cadastrada (decisão do usuário na implementação).

### Fora de escopo
- Assinatura digital com certificado (ICP-Brasil) e validação de integridade do PDF. A imagem é só uma assinatura digitalizada, como avisa a página de apoio do atestado.
- Assinar documentos antigos depois de emitidos.
- Assinatura do paciente nos documentos (TCLE, autorização de imagem, registro de recusa).
- Trocar o nome/registro impresso nos modelos: os PDFs são do Ruan.

## Plano
### Abordagem
A assinatura fica no banco, em uma tabela própria só de acréscimo (`AssinaturaProfissional`). `User.assinaturaAtualId` aponta para a versão vigente. `DocumentoPaciente.assinaturaId` congela a versão usada na emissão (só em tipos com caixa de assinatura). São poucos KB por versão, não exigem R2 e funcionam no E2E sem configuração de storage. O catálogo de documentos ganha, por tipo, as **caixas de assinatura** (página do modelo e retângulo em pontos PDF). `preencherDocumento` recebe a imagem congelada e desenha com `embedPng`/`drawImage` (proporção mantida, centralizada e alinhada pela base) depois do `flatten` e antes de remover as páginas. A UI reaproveita `AssinaturaPad` e acrescenta a opção "Enviar foto".

### Dados
Migration aditiva, sem DROP:
```prisma
model AssinaturaProfissional {
  id           String              @id @default(cuid())
  userId       String?             // SetNull: excluir o usuário não apaga a versão (RN4)
  user         User?               @relation("AssinaturasDoUsuario", fields: [userId], references: [id], onDelete: SetNull)
  png          Bytes
  createdAt    DateTime            @default(now())
  documentos   DocumentoPaciente[]
  usuarioAtual User?               @relation("AssinaturaAtual")
  @@index([userId])
}
// User: assinaturaAtualId String? @unique → AssinaturaProfissional (onDelete: SetNull), relation "AssinaturaAtual"
// DocumentoPaciente: assinaturaId String? → AssinaturaProfissional (onDelete: SetNull)
```
- `MODULO_LABEL`: `AssinaturaProfissional: "Assinatura do profissional"`.
- Auditoria (RN8): hoje `sanitizarValorAuditoria` só reconhece `Buffer`, e o Prisma 7 devolve `Bytes` como `Uint8Array`, o que serializaria cada byte. Tratar todo `ArrayBuffer.isView(valor)` como `"[binário]"`.
- Queries existentes de `User` sem `select` não carregam bytes, porque estão em outra tabela.

### Caixas de assinatura (ponto de partida; ajustar visualmente)
Medidas com `pdftotext -bbox` (y a partir do topo, página A4 de 841,89 pt). A caixa fica logo **acima** do nome impresso. Na implementação, converter para a origem do pdf-lib (`y = 841,89 − topo`) e conferir renderizando.

| Tipo | Página | Âncora (nome impresso) | Observação |
|---|---|---|---|
| encaminhamento-multiprofissional | — | — | sem caixa: o modelo já tem carimbo + assinatura (RN9) |
| solicitacao-exames | — | — | sem caixa: o modelo já tem carimbo + assinatura (RN9) |
| solicitacao-prorrogacao | 0 | nome centralizado y≈782 | |
| atestado-fisioterapeutico | 0 | nome centralizado y≈744 | |
| declaracao-comparecimento | 0 | nome centralizado y≈671 | |
| relatorio-tecnico | 0 | nome centralizado y≈774 | |
| parecer-tecnico | 1 | nome centralizado y≈783 | página 1 do arquivo |
| alta-fisioterapeutica | 0 | nome centralizado y≈780 | |
| tcle | 1 | coluna direita x≈312 y≈758 | não na rubrica (p0) nem na coluna do paciente |
| autorizacao-imagem | 0 | coluna direita x≈312 y≈791 | |
| registro-recusa | 0 | coluna direita x≈312 y≈767 | |

### Arquivos
| Arquivo | Mudança | Cobre |
|---|---|---|
| `prisma/schema.prisma` + migration | model e campos acima | RN3, RN4 |
| `src/lib/audit.ts` (+ test) | `MODULO_LABEL` e `ArrayBuffer.isView` → `"[binário]"` | RN8 |
| `src/lib/assinatura-imagem.ts` (+ test) | funções puras sobre `RGBA`: `limparFundo` (limiar pela luminância média das bordas), `recortarBordas`, `dimensoesSaida` (≤900×300) e `dimensoesPng(bytes)` (lê o IHDR, para o server) | CA2, CA9, RN6 |
| `src/lib/documentos-catalogo.ts` (+ test) | `TipoDocumento.assinaturas: CaixaAssinatura[]` (`{ pagina, x, y, largura, altura }`). O teste garante que todo tipo, exceto os dois da RN9, tem ao menos uma caixa, em página de `paginas` e dentro da página | CA4, CA10 |
| `src/lib/documentos-pdf.ts` (+ test) | `preencherDocumento(tipo, valores, assinaturaPng?)` e `encaixarImagem(img, caixa)` pura | CA4, CA6, CA10 |
| `src/lib/documentos-paciente.ts` | `gerarPdfDocumento` passa `assinatura.png` gravada no documento (nunca a atual do autor) | CA4, CA5 |
| `src/actions/assinatura-profissional.ts` | `salvarMinhaAssinatura(dataUrl)` (`decodificarAssinaturaPng` importado de `contrato-regras.ts` + `dimensoesPng`) e `removerMinhaAssinatura()`. Sessão só para o próprio usuário, revalida `/usuarios/[id]` | CA1–3, CA8, RN5, RN6 |
| `src/actions/documentos-paciente.ts` | `criarDocumento` grava `assinaturaId` = `assinaturaAtualId` do autor quando o tipo tem caixa (`tipoAceitaAssinatura`). `atualizarDocumento` não altera | RN3, CA5, CA10 |
| `src/components/usuarios/assinatura-card.tsx` | card com prévia da atual e duas opções, "Desenhar" (`AssinaturaPad`) e "Enviar foto" (`<input type=file accept="image/*">`, que abre a câmera no celular, + processamento em canvas e erros do CA9). As opções ficam em grade de botões no mobile, sem rolagem horizontal. Botões Salvar e Remover (com confirmação) no próprio card. Não usa `FormActions`: a página já tem a barra fixa do formulário do usuário | CA1, CA2, CA8, CA9 |
| `src/app/(app)/usuarios/[id]/page.tsx` | mostra o card só se `id === sessão`. A prévia vai como data URL montada no server | CA1, CA3 |
| `src/components/pacientes/paciente-documentos-tab.tsx` e `src/app/(app)/pacientes/[id]/documentos/novo/page.tsx` | aviso com link quando o usuário logado não tem assinatura | CA6 |

### Testes
- Unit `audit.test.ts`: `Uint8Array` e `Buffer` viram `"[binário]"` (RN8).
- Unit `assinatura-imagem.test.ts`:
  - fundo branco/cinza vira alfa 0 e o traço escuro é preservado;
  - recorte das bordas com margem;
  - imagem vazia depois da limpeza → erro;
  - redução proporcional para ≤900×300;
  - `dimensoesPng` lê largura/altura e recusa bytes que não são PNG (CA2, CA9, RN6).
- Unit `documentos-catalogo.test.ts`: caixas válidas por tipo; encaminhamento e solicitação de exames sem caixa (CA4, CA10).
- Unit `documentos-pdf.test.ts`:
  - `encaixarImagem` mantém a proporção e centraliza;
  - `preencherDocumento` com PNG → a página certa tem a imagem (`XObject`);
  - `preencherDocumento` sem PNG, ou em tipo sem caixa → nenhuma imagem extra (CA4, CA6, CA10).
- E2E `e2e/tests/documentos.spec.ts` (estender):
  - **Emitir assinado:** desenhar e salvar a assinatura no próprio usuário e emitir uma declaração de comparecimento. Conferir no banco `assinaturaId` e que o PDF responde 200 pela rota da equipe **e pela do portal** (CA1, CA4).
  - **Congelamento:** trocar a assinatura e conferir que o documento antigo mantém `assinaturaId`; emitir um encaminhamento e conferir `assinaturaId` nulo (CA5, CA10).
  - **Outro usuário:** abrir a tela de outro usuário → o card não aparece (CA3).
  - **Foto:** enviar foto (fixture PNG em `e2e/fixtures/`) → a prévia aparece; enviar um arquivo que não é imagem → mensagem de erro e Salvar desabilitado (CA2, CA9).
  - **Celular:** desenhar em viewport de 375px (CA1).

### Riscos
- **Posição das caixas**: coordenadas erradas cobrem texto. Mitigação: renderizar cada tipo assinado (`pdftoppm`) na implementação e conferir visualmente.
- **Foto com fundo irregular** (sombra, papel pautado): pode deixar manchas. O limiar é calculado pela luminância das bordas, a prévia aparece antes de salvar e o usuário pode desenhar se não ficar bom.
- **Modelos com o nome do Ruan**: outro profissional que emitir vai assinar sobre o nome do Ruan (RN1). Isso é aceito porque hoje só ele emite, e fica registrado no `docs/documentos.md`.

## Tarefas
- [x] T1 Migration aditiva + schema (`AssinaturaProfissional` com `userId` opcional/SetNull, `User.assinaturaAtualId`, `DocumentoPaciente.assinaturaId`), `MODULO_LABEL` e `ArrayBuffer.isView` na auditoria + teste — `prisma/`, `src/lib/audit.ts` (RN3, RN4, RN8)
- [x] T2 `src/lib/assinatura-imagem.ts` + teste (limpar fundo, recortar, redimensionar, `dimensoesPng`) — (CA2, CA9, RN6)
> Desvio (T3): encaminhamento e solicitação de exames já têm carimbo + assinatura embutidos no PDF; o usuário decidiu não assinar esses dois (RN9). Sem colunas por modalidade, `assinaturaModalidades` e o CA7 saíram.
- [x] T3 Caixas de assinatura no catálogo + teste, com coordenadas conferidas renderizando cada tipo — `documentos-catalogo.ts` (CA4, CA10)
- [x] T4 `preencherDocumento` com assinatura + `encaixarImagem` + testes — `documentos-pdf.ts` (CA4, CA6, CA10)
- [x] T5 `gerarPdfDocumento` usa a assinatura congelada — `documentos-paciente.ts` (CA4, CA5)
- [x] T6 Actions `salvarMinhaAssinatura`/`removerMinhaAssinatura` (só o próprio usuário, valida PNG e dimensões). `criarDocumento` grava `assinaturaId` só em tipo com caixa — `src/actions/` (CA1, CA3, CA5, CA8, CA10, RN5, RN6)
- [x] T7 `AssinaturaCard` (desenhar / enviar foto / prévia / remover / erros, responsivo) na tela do próprio usuário — (CA1, CA2, CA3, CA8, CA9)
- [x] T8 Aviso "Cadastrar minha assinatura" na aba Documentos e em `documentos/novo` — (CA6)
- [x] T9 E2E em `e2e/tests/documentos.spec.ts` — (CA1–CA5, CA9, CA10)
- [x] T10 Verificar: `npm test`, `npx tsc --noEmit`, `npx next build`
- [x] T11 Atualizar `docs/documentos.md` (assinatura congelada, caixas no catálogo, RN1 e RN9 sobre os modelos do Ruan) e `docs/ops.md` (auditoria omite binários), além do `README.md` das pastas tocadas
