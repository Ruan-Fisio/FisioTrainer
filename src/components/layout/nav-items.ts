import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Usuários", href: "/usuarios", icon: Users },
];
