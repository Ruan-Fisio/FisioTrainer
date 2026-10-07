/** Mantém só os dígitos. */
export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Máscara progressiva de celular com DDD: (11) 91234-5678. Limita a 11 dígitos. */
export function mascararCelular(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Celular válido: DDD 11–99 + 9 dígitos começando com 9. */
export function celularValido(valor: string): boolean {
  return /^[1-9][1-9]9\d{8}$/.test(soDigitos(valor));
}
