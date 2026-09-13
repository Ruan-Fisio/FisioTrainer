"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PlanosTabs({
  tab,
  catalogo,
  renovacoes,
}: {
  tab: string;
  catalogo: React.ReactNode;
  renovacoes: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function mudarTab(novaTab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", novaTab);
    // filtros/paginação são específicos do catálogo — limpa ao trocar de aba
    params.delete("page");
    params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={tab} onValueChange={mudarTab}>
      <TabsList>
        <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
        <TabsTrigger value="renovacoes">Renovações</TabsTrigger>
      </TabsList>
      <TabsContent value="catalogo" className="pt-4">
        {catalogo}
      </TabsContent>
      <TabsContent value="renovacoes" className="pt-4">
        {renovacoes}
      </TabsContent>
    </Tabs>
  );
}
