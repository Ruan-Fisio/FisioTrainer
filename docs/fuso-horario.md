# Fuso horário — Brasília

## Fuso horário — tudo em horário de Brasília (LEIA ANTES DE MEXER EM QUALQUER DATA)

A clínica opera em `America/Sao_Paulo` (UTC-3 fixo, sem horário de verão desde 2019). **Não confie no fuso do processo** — a Vercel roda as server functions em UTC e o `next.config.ts` seta `process.env.TZ` mas isso não é 100% garantido em todo runtime. O navegador de um usuário pode estar em qualquer fuso. **Toda lógica de data tem que ser explícita sobre o fuso**, no servidor e no cliente.

### Bug recorrente

Todo problema de "evento com hora errada / evento sumindo do calendário / contador da semana zerado" teve a mesma raiz: algum código montou uma data ou uma borda de intervalo usando o fuso do processo/navegador em vez de Brasília, e servidor e cliente discordaram por 3h.

**Incidente de 2026-09-14** (reportado em produção: `/logs` mostrando UTC em vez de Brasília): uma varredura da base achou o mesmo padrão repetido em ~20 arquivos — cada tela/action tinha sua própria função `formatarData` local chamando `toLocaleString`/`toLocaleDateString`/`Intl.DateTimeFormat` cru, a maioria sem `timeZone`; e a lógica de bordas de mês/semana (`datas-brasilia.ts`, `getIntervaloVisivel`) e a interpretação de data+hora de formulário (`combinarDataHora`) resolviam o fuso "na mão" (string com offset `-03:00`, `Date.UTC` + dia 15 ao meio-dia como âncora segura, cálculo manual de dia-da-semana). Isso funcionava, mas cada arquivo reimplementava seu próprio pedaço de calendário/fuso — superfície grande pra um novo bug se esconder. A correção definitiva trocou a mão-na-massa por **`date-fns-tz`** (par `toZonedTime`/`fromZonedTime`) por baixo de todos os helpers — ver `OBRIGATÓRIO` abaixo.

**Prevenção — regra de lint, não só disciplina.** `eslint.config.mjs` tem uma regra `no-restricted-syntax` (`regrasDataFuso`) que **bane** `date.toLocaleString/toLocaleDateString/toLocaleTimeString(...)` e `new Intl.DateTimeFormat(...)` crus em qualquer arquivo de `src/**`. Só é permitido chamar essas APIs dentro de `src/lib/format.ts` (a fonte da verdade dos helpers de exibição — hoje só `formatarMoeda`, com `Intl.NumberFormat`, ainda usa uma API crua; toda formatação de data já é `date-fns-tz`) e `src/components/ui/**` (shadcn vendorizado, `Number.prototype.toLocaleString`). **Se precisar de uma formatação de data que ainda não existe em `src/lib/format.ts`, adicione a função lá** (com `formatInTimeZone(data, TIMEZONE, padrão)`) **em vez de formatar na mão no componente/action** — assim o lint passa e o próximo dev reusa. Rodar `npx eslint .` pega qualquer novo caso antes de chegar em produção.

### PROIBIDO (essas APIs usam o fuso do processo/navegador)

- `new Date("2026-09-03T13:10:00")` sem offset → use `combinarDataHora(data, hora)`
- `date.getHours()` / `getDate()` / `getDay()` / `getMonth()` / `setHours(...)` para lógica sobre um instante real (não um `Date` que você mesmo construiu e vai só reler no mesmo processo) → use os helpers de `src/lib/format.ts` / `src/lib/datas-brasilia.ts`
- `date-fns` `startOfDay` / `endOfDay` / `startOfWeek` / `endOfWeek` / `startOfMonth` / `endOfMonth` direto num instante real, sem passar por `toZonedTime` primeiro → use `src/lib/datas-brasilia.ts`
- `date.toLocaleString/toLocaleDateString/toLocaleTimeString(...)` e `new Intl.DateTimeFormat(...)` **fora de `src/lib/format.ts`** — o lint bloqueia (ver acima)
- `date-fns` `format(...)` num instante real sem `timeZone` (não aceita a opção) → use `formatInTimeZone` (de `date-fns-tz`) ou os helpers de `formatarX`
- comparar dois `Date` "do mesmo dia" via `d.getFullYear()===... && getMonth()===...` → compare `toDateInputValue(a) === toDateInputValue(b)`
- montar uma borda de mês a partir de `ano`/`mes` numéricos com `new Date(ano, mes-1, dia)` → use `dataBrasilia(ano, mes, dia)`

### OBRIGATÓRIO — tudo via `date-fns-tz` (`toZonedTime`/`fromZonedTime`/`formatInTimeZone`), nunca offset manual

- **Entrada (form → banco)**: `combinarDataHora(data, hora)` (`src/lib/validations/agendamento.ts`) — usa `fromZonedTime(\`${data}T${hora}:00\`, TIMEZONE)`: resolve o offset pelo banco IANA de fusos em vez de um `-03:00` fixado na mão, e independe do fuso do processo.
- **Colunas com hora relevante**: `@db.Timestamptz(3)` (ex. `Agendamento.dataInicio/dataFim`) — instante real, não timestamp naïve.
- **Exibição**: helpers de `src/lib/format.ts` (todos via `formatInTimeZone`, ancorados em `TIMEZONE = "America/Sao_Paulo"` — exportado dali, reusar em vez de repetir a string): `formatarData`, `formatarDataHora`, `formatarDataHoraSegundos` (com segundos, usado em `/logs`), `formatarDataExtenso` (com dia da semana), `formatarDataHoraExtenso`, `formatarDiaMes`/`formatarDiaMesHora` (sem dia da semana), `formatarHora` (só HH:mm, exibição), `formatarMes` (nome do mês), `formatarDataSemHora` (campos de **data pura** tipo `Paciente.dataNascimento`/`Feriado.data @db.Date`, gravados como meia-noite UTC — usa `timeZone: "UTC"`, nunca Brasília, senão mostra o dia anterior), `formatarYmd` (reformata string "YYYY-MM-DD" sem passar por `Date`, não precisa de fuso), `toDateInputValue` (YYYY-MM-DD), `toTimeInputValue` (HH:mm), `horaDoDia` (0-23, para agrupar por faixa horária).
- **Bordas de intervalo (dia/semana/mês) em server action / query**: `src/lib/datas-brasilia.ts` — `inicioDoDia`, `fimDoDia`, `inicioDaSemana`/`fimDaSemana` (semana começa domingo), `inicioDoMes`/`fimDoMes`, `inicioDoProximoMes`, `anoMesBrasilia` (ano/mês do instante — nunca `d.getFullYear()`/`d.getMonth()`), `dataBrasilia(ano, mes, dia?)` (constrói o início de um dia/mês a partir de campos numéricos, ex. vindos de um `<select>`). Cada uma faz `toZonedTime(d, TIMEZONE)` → operação pura do `date-fns` (`startOfDay`, `startOfWeek`, ...) → `fromZonedTime(..., TIMEZONE)` — nunca string com offset, nunca `Date.UTC` na mão. É o que `getContagensAgenda`/`getProximosAgendamentos` (`src/actions/dashboard.ts`) e `getIntervaloVisivel` (`src/lib/calendario.ts`, calendário de `/agenda`) usam.
- **Casar evento com célula de calendário** (`calendario-mes.tsx`, `grade-horaria.tsx`): comparar `toDateInputValue(dia) === toDateInputValue(evento.dataInicio)`, nunca comparar instantes ou usar `getDate()`.
- **Runtime (defesa extra, não fonte da verdade)**: `next.config.ts` faz `process.env.TZ = process.env.APP_TIMEZONE ?? "America/Sao_Paulo"`. `TZ` é nome reservado na Vercel; para trocar o fuso use a env var `APP_TIMEZONE`.
- **Testes (`vitest`)**: `vitest.config.mts` precisa do alias `"@" → "./src"` (`resolve.alias`) porque o Vite não lê `tsconfig.json` `paths` sozinho — qualquer módulo de `src/lib` que importe outro via `@/...` (ex. `datas-brasilia.ts` importando `TIMEZONE` de `@/lib/format`) quebra os testes sem esse alias.

### Testes de regressão

`src/lib/datas-brasilia.test.ts` e `src/lib/validations/agendamento.test.ts` cobrem os limites e o `combinarDataHora` — rodam com `TZ` qualquer (o CI/local pode estar em Brasília, então os testes forçam cenários de virada de dia). Rodar `npm test` ao mexer em data.

