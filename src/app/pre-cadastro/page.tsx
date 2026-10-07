import type { Metadata } from "next";
import { PreCadastroForm } from "@/components/pre-cadastro/pre-cadastro-form";

export const metadata: Metadata = { title: "Pré-cadastro" };

export default function PreCadastroPage() {
  return <PreCadastroForm />;
}
