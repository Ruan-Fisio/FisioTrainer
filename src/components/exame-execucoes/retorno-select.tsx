"use client";

import { useRouter, usePathname } from "next/navigation";

export function RetornoSelect({
  retornos,
  value,
}: {
  retornos: { id: string; data: Date }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      className="h-8 w-full max-w-xs min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30 print:hidden"
      value={value}
      onChange={(e) =>
        router.push(`${pathname}?retornoId=${e.target.value}`)
      }
    >
      {retornos.map((retorno) => (
        <option key={retorno.id} value={retorno.id}>
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(retorno.data)}
        </option>
      ))}
    </select>
  );
}
