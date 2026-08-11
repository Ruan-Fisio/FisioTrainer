"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "@/components/layout/nav-links";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 border-sidebar-border p-0 text-sidebar-foreground"
        style={{
          background:
            "linear-gradient(175deg, color-mix(in oklch, var(--sidebar), white 6%), var(--sidebar) 55%, color-mix(in oklch, var(--sidebar), black 15%))",
        }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
            <Image
              src="/logo.png"
              alt="FisioTrainer"
              width={523}
              height={342}
              className="h-auto w-10 object-contain"
            />
            FisioTrainer
          </SheetTitle>
        </SheetHeader>
        <div className="px-3 py-2">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
