import type { NextConfig } from "next";

// A clínica opera em horário de Brasília. Fixar o fuso do runtime Node faz o
// servidor (RSC, server actions, date-fns) concordar com o navegador dos usuários,
// independente de onde estiver hospedado (a Vercel roda em UTC por padrão).
// `TZ` é nome reservado na Vercel; para sobrescrever use a env var APP_TIMEZONE.
// Forçamos sempre (sem cair no TZ do processo) porque o calendário monta a grade
// de dias no servidor e casa com os eventos no cliente — os dois precisam do
// mesmo fuso, senão eventos "somem" das células por 3h de diferença.
process.env.TZ = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

const nextConfig: NextConfig = {
  agentRules: false,
  // A suíte E2E (Playwright) sobe um segundo `next dev` (porta 3100) ao lado do seu
  // `npm run dev` normal (porta 3000) — sem isolar o `distDir`, o Next 16 recusa subir
  // (detecta "another dev server is already running" pelo lock dentro de `.next/`,
  // mesmo em porta diferente). `NEXT_DIST_DIR` só é setada pelo `playwright.config.ts`.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
