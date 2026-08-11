import Image from "next/image";
import { NavLinks } from "@/components/layout/nav-links";

export function Sidebar() {
  return (
    <aside
      className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border text-sidebar-foreground shadow-xl shadow-black/10 md:flex"
      style={{
        background:
          "linear-gradient(175deg, color-mix(in oklch, var(--sidebar), white 6%), var(--sidebar) 55%, color-mix(in oklch, var(--sidebar), black 15%))",
      }}
    >
      <div className="flex h-20 items-center gap-2 border-b border-sidebar-border/60 px-6">
        <div className="flex items-center justify-center rounded-lg bg-white p-1.5 shadow-sm">
          <Image
            src="/logo.png"
            alt="FisioTrainer"
            width={523}
            height={342}
            className="h-auto w-9 object-contain"
          />
        </div>
        <span className="text-lg font-semibold tracking-tight">
          FisioTrainer
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks />
      </div>
    </aside>
  );
}
