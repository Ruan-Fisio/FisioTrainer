import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Kpi = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  /** Destaca o valor (ex. vermelho para "Em atraso"). */
  tone?: "default" | "danger";
};

export function KpiGrid({
  kpis,
  className,
}: {
  kpis: Kpi[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </CardTitle>
            <kpi.icon
              className={cn(
                "size-4",
                kpi.tone === "danger"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold tabular-nums",
                kpi.tone === "danger" && "text-destructive",
              )}
            >
              {kpi.value}
            </div>
            {kpi.hint && (
              <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
