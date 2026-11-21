# 004 — Análise postural por IA no esquema "Protocolo FisioTrainer"
Status: implementado (falta validar com fotos reais de paciente)

Evolução da `003-analise-postural-ia.md`: mesmo pipeline e regras (consentimento, limite, nada salvo sem clicar em Salvar), mas o desenho segue o esquema do protocolo enviado pelo fisio (vistas anterior e posterior).

## Spec
### Problema
As marcações da 003 (textos soltos, linha da coluna) não seguem o padrão visual que o fisio usa nas avaliações. Ele quer que a IA desenhe **as mesmas linhas do esquema** e **indique quais linhas encontrou**.

### Critérios de aceite
- **CA1** Dada uma foto **posterior**, a análise desenha: eixo vertical azul (do vértice até o meio dos calcâneos); pontos verdes em vértice, C7, acrômios, ângulos inferiores das escápulas, EIPS, fossas poplíteas e calcâneos; linhas *acromial*, *escapular*, *pélvica (EIPS)* e *alinhamento dos pés*; marco "C7"; rótulos de região à esquerda (Cabeça/Cervical, Ombros, Escápulas, Coluna/Tronco, Pelve, Joelhos, Tornozelos/Pés) e o nome de cada linha à direita.
- **CA2** Dada uma foto **anterior**, a análise desenha: eixo vertical; pontos em vértice, acrômios, manúbrio, EIAS, patelas, tornozelos e pés; linhas *acromial*, *pélvica (EIAS)*, dos joelhos (patelas, sem rótulo) e *alinhamento dos pés*; marco "Manúbrio (esterno)"; regiões Cabeça, Ombros, Tronco, Pelve, Patelas, Joelhos, Tornozelos/Pés.
- **CA3** Par nivelado (< 1°) = linha **azul tracejada**. Par assimétrico = referência horizontal **azul** + linha real **laranja tracejada** + caixa laranja com o ângulo e "Inclinação para {lado mais baixo do paciente}". A partir de 5° a cor é **vermelha** (acentuada).
- **CA4** O aviso do editor lista as linhas encontradas com o resultado ("Linha acromial: 2,5°, inclinação para esquerda", "Linha escapular: nivelada"), o eixo do tronco (C7/manúbrio em relação ao eixo, em cm com calibração), o que não foi encontrado e a legenda de cores.
- **CA5** Ponto não localizado → a linha dependente não é desenhada e aparece em "Não encontrado"; os pontos achados continuam.
- **CA6** Pontos, rótulos e linhas são editáveis (mover, apagar; texto do rótulo editável) e passam no schema de salvar.

### Regras de negócio
- **RN1** Cores fixas do protocolo (não usam a cor selecionada no editor): azul `#2563eb` referências, verde `#22c55e` pontos, laranja `#f97316` assimetria, vermelho `#ef4444` acentuada.
- **RN2** Limiares: assimetria a partir de 1°, acentuada a partir de 5° (`LIMIAR_*` em `analise-postural.ts`). Desvio do tronco é significativo a partir de 1 cm (com calibração) ou 1% da altura da imagem.
- **RN3** "Inclinação para X" = lado do **paciente** que está mais baixo.
- **RN4** Classificação com modelo leve (`GEMINI_MODEL`, padrão `gemini-3.8-flash`); localização com modelo preciso (`GEMINI_MODEL_PONTOS`, padrão `gemini-3.1-pro-preview`).

### Fora de escopo
- Vista lateral no esquema do protocolo (segue o desenho da 003, com pontos verdes).
- Linha da coluna vértebra a vértebra (o esquema não tem; o desvio do tronco é medido pelo C7/manúbrio em relação ao eixo).
- Legenda desenhada sobre a imagem (fica no aviso do editor).

## Plano
### Abordagem
Novos tipos de forma no schema de anotações (sem migration, é JSON): `ponto`, `rotulo` (caixa com linha de chamada; estilos `regiao`, `linha`, `marco`, `alerta`) e `linha.tracejada`. `formasProtocolo` monta o desenho a partir de uma definição por vista (regiões, pares, marcos, base do eixo). Pipeline LangChain com três ramos (anterior, posterior, lateral) e dois modelos.

**Escolha do modelo** (teste em 2026-11-21 com as imagens do esquema, sem as marcações, contra os pontos verdes originais): `gemini-3.1-pro-preview` localizou os 12 pontos com erro médio de 0,7% (posterior) e 1,0% (anterior) da altura da imagem; `gemini-3.8-flash` e `gemini-3.5-flash` devolveram só o vértice; `gemini-robotics-er-2-preview` e `gemini-pro-latest` não aceitam imagem pela API usada.

### Dados
Nenhuma migration. Tipos novos em `src/lib/anotacoes-imagem.ts` (opcionais, retrocompatíveis).

### Arquivos
| Arquivo | Mudança | Cobre |
|---|---|---|
| `src/lib/anotacoes-imagem.ts` | `ponto`, `rotulo`, `linha.tracejada`, `medidasRotulo`, `quebrarLinhas` | CA6 |
| `src/components/pacientes/anotacoes-camada.tsx` | Desenho e área de toque dos novos tipos | CA1–CA3 |
| `src/lib/analise-postural.ts` | Schemas anterior/posterior, `formasProtocolo`, achados | CA1–CA5 |
| `src/lib/analise-postural-pipeline.ts` | Ramos anterior/posterior/lateral; modelo leve + preciso | RN4 |
| `src/lib/ia-config.ts` | `modeloPontosIa` | RN4 |
| `src/components/pacientes/anotar-imagem-dialog.tsx` | Aviso com linhas encontradas + legenda; edição do texto de rótulos | CA4, CA6 |

### Testes
- Unit `src/lib/analise-postural.test.ts` — protocolo posterior/anterior, assimetria laranja/vermelha, lado do paciente, desvio do tronco em px/cm, ausentes, schema de salvar.
- Unit `src/lib/analise-postural-pipeline.test.ts` — roteamento dos três ramos.
- E2E `e2e/tests/analise-postural-ia.spec.ts` — rótulos do esquema, alerta, aviso com linhas encontradas.

## Tarefas
- [x] T1 Novos tipos de forma + desenho
- [x] T2 `formasProtocolo` (posterior/anterior) + testes
- [x] T3 Pipeline com três ramos e dois modelos + testes
- [x] T4 Aviso com linhas encontradas e legenda
- [x] T5 E2E atualizado
- [x] T6 Verificar: `npm test`, `npx tsc --noEmit`, `npx next build`
- [ ] T7 Validar com fotos reais de pacientes (anterior e posterior)
- [x] T8 Atualizar `docs/exames.md`
