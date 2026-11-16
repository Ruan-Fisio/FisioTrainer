# Documentos do paciente

Aba **Documentos** do paciente (`/pacientes/[id]?tab=documentos`): encaminhamentos, solicitação de exames, atestados e demais documentos clínicos emitidos a partir dos modelos PDF preenchíveis (AcroForm) do Ruan.

## Como funciona

- Modelos em `src/assets/documentos/*.pdf` (só servidor). Ficam listados em `outputFileTracingIncludes` no `next.config.ts` — rota nova que gere PDF precisa entrar lá, senão a Vercel não empacota os arquivos.
- `src/lib/documentos-catalogo.ts` descreve cada tipo: título, categoria, arquivo, **páginas mantidas** e seções/campos do formulário. O `nome` de cada campo é o nome do campo no AcroForm, e `max` é o limite de caracteres do PDF.
  - `documentos-catalogo.test.ts` compara o catálogo com os PDFs (nomes, tipo, limite, multiline, página). Trocou um PDF → o teste aponta o que mudou.
- O banco guarda só os valores (`DocumentoPaciente.valores`, JSON). O PDF é gerado **sob demanda** (`src/lib/documentos-pdf.ts`, `pdf-lib`): preenche, ajusta o tamanho da fonte das caixas de texto (10pt, reduz até 6pt se não couber), **achata** o formulário e remove as páginas fora do tipo. Editar o documento muda o PDF.
- Páginas de "Apoio ao profissional" (atestado, relatório/parecer) nunca entram no PDF. `relatorio-parecer.pdf` vira dois tipos: relatório técnico (página 1) e parecer técnico (página 2).
- Datas são `<input type="date">` gravadas como `YYYY-MM-DD` e impressas `DD/MM/AAAA` (`valorParaPdf`). "Hoje" é em Brasília (`toDateInputValue`); nascimento é data pura (`ymdDataSemHora`).
- Texto vai para o PDF com a fonte Helvetica (WinAnsi): `paraWinAnsi` tira emoji e caracteres fora do Latin-1, senão a geração quebra.

## Preenchimento automático

- `prefill`: nome, nascimento, CPF (como "CPF …") do paciente e a data de hoje.
- `lembrar`: dados do profissional (local de emissão, endereço, contato, CEP…) vêm do documento mais recente de **qualquer** paciente/tipo que tenha o mesmo `lembrar`.

## Portal do paciente

- **Todo documento emitido aparece no portal** (`/compartilhado/paciente/[token]?tab=documentos`) — decisão da clínica, sem opção por documento. Excluir o documento tira do portal.
- PDF público em `/compartilhado/paciente/[token]/documentos/[id]/pdf`: o paciente vem do token, e documento de outro paciente responde 404.
- Equipe: `/api/documentos/[id]/pdf` (exige sessão).

## Adicionar um modelo novo

1. Copiar o PDF para `src/assets/documentos/<slug>.pdf`.
2. Listar os campos (nome, tipo, `maxLength`, multiline, página) com `pdf-lib` e criar o tipo no catálogo com os mesmos nomes e limites.
3. `npx vitest run src/lib/documentos` — o teste do catálogo valida tudo contra o PDF.
