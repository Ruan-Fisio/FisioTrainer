/** Sufixo único por execução, pra specs criarem entidades sem colidir entre si/entre runs. */
export function nomeUnico(prefixo: string): string {
  return `${prefixo} E2E ${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}
