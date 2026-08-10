"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { navItems, type NavLeaf } from "@/components/layout/nav-items";

const linkClasses = (isActive: boolean) =>
  cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
    isActive &&
      "bg-sidebar-accent text-sidebar-foreground [&_svg]:text-sidebar-primary",
  );

function NavGroup({
  title,
  icon: Icon,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  icon: LucideIcon;
  items: NavLeaf[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const isGroupActive = items.some((leaf) => pathname.startsWith(leaf.href));
  const [open, setOpen] = useState(isGroupActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className={cn(linkClasses(isGroupActive), "w-full")}>
          <Icon className="size-4" />
          <span className="flex-1 text-left">{title}</span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-1 py-1 pl-6">
        {items.map((leaf) => {
          const isActive = pathname.startsWith(leaf.href);
          return (
            <Link
              key={leaf.href}
              href={leaf.href}
              onClick={onNavigate}
              className={linkClasses(isActive)}
            >
              {leaf.title}
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;

        if ("href" in item) {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={linkClasses(isActive)}
            >
              <Icon className="size-4" />
              {item.title}
            </Link>
          );
        }

        return (
          <NavGroup
            key={item.title}
            title={item.title}
            icon={Icon}
            items={item.items}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}
