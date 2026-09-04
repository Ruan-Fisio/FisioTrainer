import type { NextConfig } from "next";

// A clínica opera em horário de Brasília. Fixar o fuso do runtime Node faz o
// servidor (RSC, server actions, date-fns) concordar com o navegador dos usuários,
// independente de onde estiver hospedado (a Vercel roda em UTC por padrão).
// `TZ` é nome reservado na Vercel; para sobrescrever use a env var APP_TIMEZONE.
process.env.TZ = process.env.APP_TIMEZONE ?? process.env.TZ ?? "America/Sao_Paulo";

const nextConfig: NextConfig = {
  agentRules: false,
};

export default nextConfig;
