import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  BriefcaseBusiness,
  Calendar,
  CheckSquare,
  Film,
  Image,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Package,
  Zap,
} from "lucide-react";

export type NavigationBadgeKey = "approvals" | "scheduled" | "failures" | "comments";

export type NavigationItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  badgeKey?: NavigationBadgeKey;
};

export const mainNavigation: NavigationItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Produtos", icon: Package, path: "/products" },
  { label: "Biblioteca de Mídia", icon: Image, path: "/media" },
  { label: "Geração de Vídeos", icon: Film, path: "/videos" },
  { label: "Aprovação", icon: CheckSquare, path: "/approval", badgeKey: "approvals" },
  { label: "Agendamento", icon: Calendar, path: "/schedule", badgeKey: "scheduled" },
  { label: "Publicações", icon: Zap, path: "/publications", badgeKey: "failures" },
  { label: "Comentários", icon: MessageSquare, path: "/comments", badgeKey: "comments" },
  { label: "Integrações", icon: Link2, path: "/integrations" },
  { label: "Comercial", icon: BriefcaseBusiness, path: "/commercial" },
  { label: "Relatórios", icon: BarChart2, path: "/reports" },
];
