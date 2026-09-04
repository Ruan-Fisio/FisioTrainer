import type { NextConfig } from "next";

// A clínica opera em horário de Brasília. Fixar o fuso do runtime Node faz o
// servidor (RSC, server actions, date-fns) concordar com o navegador dos usuários,
// independente de onde estiver hospedado (a Vercel roda em UTC por padrão).
// Em produção, defina também a env var TZ=America/Sao_Paulo no painel da Vercel.
process.env.TZ ??= "America/Sao_Paulo";

const nextConfig: NextConfig = {
  agentRules: false,
};

export default nextConfig;
