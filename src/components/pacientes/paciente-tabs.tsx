"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PacienteTabs({
  tabs,
  defaultValue,
}: {
  tabs: { value: string; label: string; action?: ReactNode; content: ReactNode }[];
  defaultValue: string;
}) {
  return (
    <Tabs defaultValue={defaultValue} className="gap-4">
      <TabsList className="w-full sm:w-fit">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="flex flex-col gap-4">
          {tab.action && <div className="flex justify-end">{tab.action}</div>}
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
