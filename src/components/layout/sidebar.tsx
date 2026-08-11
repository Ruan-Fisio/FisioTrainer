import Image from "next/image";
import { NavLinks } from "@/components/layout/nav-links";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-20 items-center gap-2 px-6">
        <Image
          src="/logo.png"
          alt="FisioTrainer"
          width={48}
          height={48}
          className="size-12 rounded-lg object-contain"
        />
        <span className="text-lg font-semibold">FisioTrainer</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks />
      </div>
    </aside>
  );
}
