import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Bug recorrente desta base: formatar/interpretar Date sem fixar o fuso deixa o resultado
// depender de onde o código roda (servidor em UTC na Vercel vs. navegador do usuário no
// Brasil), causando hora/dia errado ou mismatch de hidratação. Toda formatação de data/hora
// tem que passar pelos helpers de "src/lib/format.ts" (que já fixam o fuso de Brasília, ou
// UTC para campos de data pura) em vez de chamar essas APIs cruas em qualquer outro lugar.
// Ver a seção "Fuso horário" do CLAUDE.md.
const MENSAGEM_DATA_FUSO =
  "Não formate Date direto — use os helpers de fuso horário de src/lib/format.ts (formatarData, formatarDataHora, formatarHora, ...) em vez de toLocale*/Intl.DateTimeFormat crus. Ver seção 'Fuso horário' do CLAUDE.md.";

const regrasDataFuso = {
  files: ["src/**/*.{ts,tsx}"],
  ignores: [
    // Fonte da verdade dos helpers de formatação — único lugar com permissão de usar
    // `Intl`/`toLocale*` cru (hoje só `formatarMoeda`, com `Intl.NumberFormat`; toda
    // formatação de data já migrou pro `date-fns-tz`, ver imports deste arquivo).
    "src/lib/format.ts",
    // Componentes shadcn/ui vendorizados — o único uso aqui é Number.prototype.toLocaleString.
    "src/components/ui/**",
    "**/*.test.ts",
    "**/*.test.tsx",
  ],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "CallExpression[callee.type='MemberExpression'][callee.property.name=/^toLocale(String|DateString|TimeString)$/]",
        message: MENSAGEM_DATA_FUSO,
      },
      {
        selector:
          "NewExpression[callee.type='MemberExpression'][callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
        message: MENSAGEM_DATA_FUSO,
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  regrasDataFuso,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
