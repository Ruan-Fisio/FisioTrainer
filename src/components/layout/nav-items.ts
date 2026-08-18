import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
  UserRound,
  Activity,
  NotebookPen,
  CalendarClock,
  Wallet,
  Receipt,
} from "lucide-react";

export type NavLeaf = {
  title: string;
  href: string;
};

export type NavItem =
  | ({ title: string; icon: LucideIcon } & NavLeaf)
  | { title: string; icon: LucideIcon; items: NavLeaf[] };

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Pacientes", href: "/pacientes", icon: UserRound },
  { title: "Planos", href: "/planos", icon: Wallet },
  { title: "Cobranças", href: "/cobrancas", icon: Receipt },
  { title: "Agenda", href: "/agenda", icon: CalendarClock },
  { title: "Exames", href: "/exames", icon: ClipboardList },
  { title: "Evoluções", href: "/evolucoes", icon: NotebookPen },
  {
    title: "Biblioteca de Exercícios",
    icon: Dumbbell,
    items: [
      { title: "Exercícios", href: "/biblioteca/exercicios" },
      { title: "Categorias", href: "/biblioteca/categorias" },
    ],
  },
  {
    title: "Biblioteca de Movimento",
    icon: Activity,
    items: [
      {
        title: "Recovery Em Goniometria",
        href: "/biblioteca-movimento/goniometria",
      },
    ],
  },
  { title: "Usuários", href: "/usuarios", icon: Users },
];
