"use client";

import { useCallback, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function PacienteTabs({
  tabs,
  defaultValue,
}: {
  tabs: {
    value: string;
    label: string;
    icon?: ReactNode;
    action?: ReactNode;
    content: ReactNode;
  }[];
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const value = tabs.some((t) => t.value === tabParam) ? tabParam! : defaultValue;

  const onValueChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams);
      if (next === defaultValue) params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaultValue, pathname, router, searchParams],
  );

  return (
    <Tabs value={value} onValueChange={onValueChange} className="gap-4">
      {/* Mobile: grade de botões que quebra em linhas — sem scroll horizontal */}
      <div
        className={cn(
          "grid gap-1.5 rounded-lg bg-muted p-1.5 md:hidden",
          tabs.length <= 2
            ? "grid-cols-2"
            : tabs.length === 3
              ? "grid-cols-3"
              : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {tabs.map((tab) => {
          const ativo = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onValueChange(tab.value)}
              aria-pressed={ativo}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
                ativo
                  ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10 [&_svg]:text-sidebar-primary"
                  : "text-foreground/60 hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Desktop: barra de abas tradicional */}
      <div className="hidden md:block">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-none whitespace-nowrap data-active:[&_svg]:text-sidebar-primary"
            >
              {tab.icon}
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
