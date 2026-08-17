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
      <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
        <TabsList className="w-max">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-none whitespace-nowrap"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="flex flex-col gap-4">
          {tab.action && <div className="flex justify-end">{tab.action}</div>}
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
