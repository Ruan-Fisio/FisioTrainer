# 003 — Análise postural automática por IA nas anotações de imagem
Status: aprovado

## Spec
### Problema
Hoje o fisio desenha à mão, no `AnotarImagemDialog`, as linhas de avaliação postural (inclinação dos ombros, desvio da coluna/tronco, pelve…). Ele quer que uma IA (Google Gemini, porque já tem créditos, orquestrado com LangChain) olhe a foto, **descubra sozinha qual é a vista** (as fotos nem sempre são da mesma posição) e desenhe as marcações automaticamente. Ele revisa e ajusta antes de salvar.

### Critérios de aceite
- **CA1** Dado o fisio no `AnotarImagemDialog` de uma imagem raster (JPEG/PNG/WebP), com a IA configurada, quando clica em **"Analisar com IA"** e confirma o aviso de envio da foto, então aparece um estado de carregamento. Ao terminar, as marcações geradas aparecem sobre a imagem e um aviso mostra a vista detectada (ex.: "Vista posterior detectada — revise as marcações geradas por IA").
- **CA2** Dado uma foto **anterior ou posterior**, quando a análise termina, então são desenhados, com o que foi detectado: (a) ângulo dos **ombros** (acrômio D→E, tipo `inclinacao`); (b) ângulo da **pelve** (EIAS na anterior / EIPS ou cristas ilíacas na posterior, `inclinacao`); (c) ângulo da **cabeça** (olhos/orelhas, `inclinacao`); (d) **eixo do tronco**: linha do ponto médio da pelve ao ponto médio dos ombros + texto com o desvio em graus em relação à vertical.
- **CA3** Dado uma foto **posterior**, quando a análise termina, então também é desenhada a **linha da coluna** (curva livre passando pelos processos espinhosos estimados, de C7 até S1) e um texto com o desvio lateral máximo da curva em relação à reta C7–S1 (em cm se a imagem estiver calibrada, senão em px).
- **CA4** Dado uma foto **lateral** (direita ou esquerda), quando a análise termina, então é desenhada a **linha de prumo** vertical a partir do maléolo lateral, os pontos de referência (trago da orelha, acrômio, trocânter maior, joelho, maléolo) ligados por linha, e um texto com a anteriorização da cabeça (distância horizontal trago↔prumo, em cm se calibrada).
- **CA5** Dado uma foto que a IA classifica como **não postural** (ex.: exame, documento, foto de parte do corpo), quando a análise termina, então nenhuma marcação é criada e aparece a mensagem "A IA não identificou uma foto de avaliação postural (vista frontal, posterior ou lateral)".
- **CA6** Dado as marcações geradas, então elas são formas comuns (mover, editar alças, apagar com borracha, trocar cor funcionam), a análise inteira é **um único passo de Desfazer**, e **nada é gravado** até o fisio clicar em Salvar (o fluxo de "sair sem salvar" continua avisando).
- **CA7** Dado que a imagem já tem marcações de uma análise anterior por IA, quando roda a análise de novo, então só as marcações geradas por IA são substituídas; as feitas à mão continuam.
- **CA8** Dado um ponto que a IA não conseguiu localizar com confiança (ex.: quadril escondido pela roupa), então a marcação que depende dele não é desenhada e o aviso lista o que ficou de fora ("Não foi possível marcar: pelve").
- **CA9** Dado `GEMINI_API_KEY` ausente no servidor, então o botão "Analisar com IA" não aparece. Dado erro/timeout da API ou resposta inválida, então aparece uma mensagem de erro visível e as anotações atuais ficam intactas.
- **CA10** Dado um usuário que atingiu o limite diário de análises, quando clica no botão, então a action recusa com "Limite diário de análises por IA atingido" sem chamar a API.
- **CA11** O botão, o aviso de consentimento e o banner de resultado funcionam em 375px.

### Regras de negócio
- **RN1** A IA **sugere**, o fisio decide: marcações geradas nunca são salvas automaticamente; vão para o estado do editor e seguem o fluxo normal de Salvar.
- **RN2** Toda forma gerada tem `id` com prefixo `ia-` (é como CA7 as identifica). O schema de anotações **não muda**: só usa tipos existentes (`inclinacao`, `linha`, `livre`, `texto`).
- **RN3** A IA devolve só **classificação + pontos**. Ângulos e distâncias são sempre calculados pelo nosso código (`inclinacaoGraus`, `formatarDistancia`, calibração), nunca pelo texto do modelo.
- **RN4** **LGPD**: a foto sai do sistema para o Google. Antes de cada análise há um diálogo de confirmação ("A foto será enviada ao Google Gemini para análise. Use apenas com consentimento do paciente."), com "não mostrar de novo nesta sessão" (estado em memória, não persistido). Só usar chave de **projeto pago** (no plano gratuito o Google pode usar os dados para treino) — registrado em `docs/`.
- **RN5** Custo: limite de **30 análises por usuário por dia** (dia de Brasília, `datas-brasilia.ts`), configurável por `IA_ANALISE_LIMITE_DIARIO`. Cada chamada (sucesso ou falha da API) grava um registro de uso.
- **RN6** Só imagens raster aceitas (`image/jpeg`, `image/png`, `image/webp`) até 15 MB; a foto é lida no **servidor** pela chave do storage (nunca enviada pelo client), então o usuário só analisa imagens que existem no sistema.
- **RN7** A cor das marcações geradas é a cor selecionada no editor no momento da análise.
- **RN8** Coluna e pontos ósseos por foto 2D são **estimativas**: o banner sempre diz "marcações geradas por IA — revise". Não é diagnóstico.

### Fora de escopo
- Mostrar a análise ao paciente no portal (o portal ainda não mostra anotações).
- Análise em lote de várias imagens ou da comparação A×B.
- Laudo/texto interpretativo gerado pela IA.
- Outros provedores (OpenAI, Claude) e modelo local (MediaPipe). Como o pipeline é LangChain, trocar o provedor é trocar o `ChatModel` em `analise-postural-pipeline.ts`.
- Remover EXIF/GPS da foto antes do envio (ver Riscos).

## Plano
### Abordagem
Pipeline **LangChain** (`@langchain/core` + `@langchain/google-genai`, `ChatGoogleGenerativeAI`, modelo em `GEMINI_MODEL`, padrão `gemini-3.8-flash`) em duas etapas, cada uma com `withStructuredOutput(zod)`:

```
foto ─► [1 classificar] ─► vista ─┬─ anterior/posterior ─► [2a localizar pontos frontais (+ coluna se posterior)]
                                  ├─ lateral_d/lateral_e ─► [2b localizar pontos laterais]
                                  └─ nao_postural ────────► fim (sem chamada extra)
```
`RunnableSequence` + `RunnableBranch` em `src/lib/analise-postural-pipeline.ts`. As etapas são `Runnable`s injetáveis: em produção são o Gemini; no teste unitário e com `ANALISE_IA_FAKE=1` (E2E/dev sem chave) são `RunnableLambda`s com resposta fixa, então o roteamento é sempre o mesmo código. Os pontos vêm em `{x, y}` na escala 0–1000 e são opcionais (ausente = não localizado). O uso de tokens vem de `includeRaw` (`usage_metadata`) e é somado nas duas etapas.

A server action `analisarPosturaImagem(imagemId)` lê os bytes do storage (`getObjectBytes`), roda o pipeline com timeout de 45 s, grava o uso e devolve `{ vista, pontos }` — **sem salvar anotações**. No client, `respostaParaFormas(...)` (lógica pura) converte em `Forma[]` com a calibração atual, e o dialog aplica como um passo de histórico substituindo as formas `ia-*`.

### Dados
Model novo `AnaliseImagemIa` (registro de uso para limite/custo; nunca guarda bytes nem a resposta crua):
```prisma
model AnaliseImagemIa {
  id          String   @id @default(cuid())
  imagemId    String?          // SetNull se a imagem for apagada
  imagem      ExameExecucaoImagem? @relation(fields: [imagemId], references: [id], onDelete: SetNull)
  userId      String?          // SetNull se o usuário for excluído
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  modelo      String
  vista       String?          // null quando falhou
  sucesso     Boolean
  tokensEntrada Int?
  tokensSaida   Int?
  createdAt   DateTime @default(now())
  @@index([userId, createdAt])
}
```
Migration só aditiva (sem backup obrigatório). Adicionar em `MODULO_LABEL` (`src/lib/audit.ts`).

### Arquivos
| Arquivo | Mudança | Cobre |
|---|---|---|
| `src/lib/analise-postural.ts` | Zod das etapas (classificação, pontos frontais, pontos laterais; `{x,y}` 0–1000 opcionais), prompts, `normalizarPonto`, `respostaParaFormas(resultado, {largura, altura, calibracao, cor})` por vista, desvio do tronco/coluna, `substituirFormasIa` | CA2–CA8, RN2, RN3, RN7 |
| `src/lib/analise-postural-pipeline.ts` (+ teste) | `criarPipelinePostural({classificar, localizarFrontal, localizarLateral})` (RunnableSequence + RunnableBranch), `etapasGemini(config)`, `etapasFake()` | CA1, CA5, CA9 |
| `src/lib/analise-postural.test.ts` | Unit (ver Testes) | idem |
| `src/lib/ia-config.ts` (+ teste) | `iaAnaliseDisponivel(env)`, `modoFakeIa(env)`, `modeloIa(env)`, `limiteDiarioIa(env)` | CA9, CA10, RN5 |
| `src/actions/analise-postural.ts` | `analisarPosturaImagem(imagemId)`: `exigirSessao`, valida mime/tamanho, confere limite, lê bytes, chama Gemini (ou fake), valida, grava `AnaliseImagemIa`, devolve resultado ou `{ error }` | CA1, CA5, CA9, CA10, RN4–RN6 |
| `prisma/schema.prisma` + migration | `AnaliseImagemIa` | RN5 |
| `src/lib/audit.ts` | `MODULO_LABEL` | — |
| `src/components/pacientes/anotar-imagem-dialog.tsx` | Botão "Analisar com IA" (ícone Sparkles) na barra, prop `iaDisponivel`, diálogo de consentimento, loading, banner (vista + ausentes + "revise"), aplicar como 1 passo de histórico | CA1, CA6–CA9, CA11 |
| `src/components/pacientes/paciente-imagens-tab.tsx` (ou onde o dialog é montado) | Passar `iaDisponivel` vindo do server | CA9 |
| `playwright.config.ts` | `ANALISE_IA_FAKE=1` e `STORAGE_DEV=db` no servidor E2E | CA1 |
| `e2e/tests/analise-postural-ia.spec.ts` | Fluxo com `ANALISE_IA_FAKE=1` | CA1, CA6 |
| `docs/exames.md` | Seção de análise por IA (regras duráveis, LGPD, chave paga) | — |

### Testes
- Unit `src/lib/analise-postural.test.ts`:
  - parse: JSON válido, pontos fora de 0–1000, vista desconhecida, campos ausentes → erro/ausente (CA9, CA8);
  - conversão `[y,x]` 0–1000 → `{x,y}` 0–1 limitado (RN2);
  - anterior/posterior gera ombros/pelve/cabeça/eixo com ids `ia-` e cor dada; ângulo do texto bate com `inclinacaoGraus` (CA2, RN3, RN7);
  - posterior gera `livre` da coluna e desvio máximo (px e cm com calibração) (CA3);
  - lateral gera prumo vertical a partir do maléolo e anteriorização (CA4);
  - `nao_postural` → zero formas (CA5); ponto ausente omite só a marcação dependente e lista em `ausentes` (CA8);
  - `substituirFormasIa` remove só `ia-*` e mantém manuais (CA7).
- Unit `src/lib/analise-postural-pipeline.test.ts`: com etapas fake, `nao_postural` não chama a etapa 2; anterior/posterior vão para a frontal; laterais para a lateral; uso de tokens somado (CA1, CA5).
- Unit `src/lib/ia-config.test.ts`: sem chave → indisponível; fake → disponível; limite inválido → 30 (CA9, CA10).
- E2E `e2e/tests/analise-postural-ia.spec.ts` (com fake; imagem inserida por `e2e/fixtures/imagens.ts`), incluindo um caso em 375px: abrir imagem → Analisar com IA → confirmar → marcações + banner → Desfazer remove todas → refazer → Salvar persiste (CA1, CA6).

### Riscos
- **Precisão**: LLM de visão localiza pontos com erro de alguns %; processos espinhosos sob roupa são chute. Mitigação: RN1/RN8, marcações editáveis, banner de revisão.
- **Privacidade**: foto do paciente vai ao Google; EXIF pode conter GPS. Mitigação: consentimento (RN4), chave paga. Remover EXIF pode virar tarefa futura.
- **Custo/latência**: ~1 chamada por clique (poucos centavos com Flash), 5–20 s. Limite diário + timeout.
- **Modelo**: nomes de modelos Gemini mudam (o `gemini-2.5-flash` já não aceita usuários novos); por isso `GEMINI_MODEL` configurável.

## Tarefas
- [x] T1 Lógica pura: schemas das etapas, prompts, normalização, `respostaParaFormas` por vista, `substituirFormasIa` — `src/lib/analise-postural.ts` + teste (CA2–CA8, RN2, RN3, RN7)
- [x] T2 Config/limite — `src/lib/ia-config.ts` + teste (CA9, CA10, RN5)
- [x] T3 Pipeline LangChain (classificar → branch → localizar), etapas Gemini e fake — `src/lib/analise-postural-pipeline.ts` + teste (CA1, CA5)
- [x] T4 Model `AnaliseImagemIa` + migration + `MODULO_LABEL` (RN5)
- [x] T5 Server action `analisarPosturaImagem` — `src/actions/analise-postural.ts` (CA1, CA5, CA9, CA10, RN4–RN6)
- [x] T6 UI no `AnotarImagemDialog`: botão, consentimento, loading, banner, aplicar como 1 passo de histórico; prop `iaDisponivel` (CA1, CA6–CA9, CA11)
- [x] T7 E2E com `ANALISE_IA_FAKE=1` — `e2e/tests/analise-postural-ia.spec.ts` (CA1, CA6)
- [ ] T8 Teste manual com chave real em fotos anterior, posterior, lateral e não postural (CA2–CA5)
- [x] T9 Verificar: `npm test`, `npx tsc --noEmit`, `npx next build`
- [x] T10 Atualizar `docs/exames.md` com as regras duráveis (RN1–RN8, variáveis de ambiente)
