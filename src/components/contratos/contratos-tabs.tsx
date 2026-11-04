"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ContratosTabs({
  tab,
  lista,
  modelo,
}: {
  tab: string;
  lista: React.ReactNode;
  modelo: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function mudarTab(novaTab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", novaTab);
    // filtros e paginação são só da lista
    params.delete("page");
    params.delete("q");
    params.delete("status");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={tab} onValueChange={mudarTab}>
      <TabsList>
        <TabsTrigger value="lista">Contratos</TabsTrigger>
        <TabsTrigger value="modelo">Modelo</TabsTrigger>
      </TabsList>
      <TabsContent value="lista" className="pt-4">
        {lista}
      </TabsContent>
      <TabsContent value="modelo" className="pt-4">
        {modelo}
      </TabsContent>
    </Tabs>
  );
}
