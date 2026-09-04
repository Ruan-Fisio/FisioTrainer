"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AgendaTabs({
  tab,
  calendario,
  lista,
}: {
  tab: string;
  calendario: React.ReactNode;
  lista: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function mudarTab(novaTab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", novaTab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Tabs value={tab} onValueChange={mudarTab}>
      <TabsList>
        <TabsTrigger value="calendario">Calendário</TabsTrigger>
        <TabsTrigger value="lista">Lista</TabsTrigger>
      </TabsList>
      <TabsContent value="calendario" className="pt-4">
        {calendario}
      </TabsContent>
      <TabsContent value="lista" className="pt-4">
        {lista}
      </TabsContent>
    </Tabs>
  );
}
