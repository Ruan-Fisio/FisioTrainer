import { soDigitos } from "@/lib/telefone";

/** CPF: máscara de digitação e comparação com o cadastro. Puro, usável no client. */

/** Máscara progressiva: 12345678901 → 123.456.789-01. Limita a 11 dígitos. */
export function mascararCpf(valor: string | null | undefined) {
  const d = soDigitos(valor ?? "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

/** Compara pelos dígitos. Cadastro sem CPF nunca confere. */
export function cpfConfere(
  digitado: string | null | undefined,
  cadastrado: string | null | undefined,
) {
  const c = soDigitos(cadastrado ?? "");
  return c.length > 0 && soDigitos(digitado ?? "") === c;
}
