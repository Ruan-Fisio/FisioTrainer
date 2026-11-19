import { BlocoSkeleton } from "@/components/metricas/blocos";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <BlocoSkeleton />
        <BlocoSkeleton />
        <BlocoSkeleton />
      </div>
    </div>
  );
}
