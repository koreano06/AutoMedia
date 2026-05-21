import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  BriefcaseBusiness,
  Calendar,
  CheckSquare,
  ClipboardList,
  Film,
  Image,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Package,
  ShoppingBag,
  Zap,
} from "lucide-react";

export type NavigationBadgeKey = "approvals" | "scheduled" | "failures" | "comments";

export type NavigationItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  section: "principal" | "vendas" | "conteudo" | "operacao";
  badgeKey?: NavigationBadgeKey;
};

export const mainNavigation: NavigationItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", section: "principal" },
  { label: "Gestão ERP", icon: ClipboardList, path: "/erp", section: "vendas" },
  { label: "Produtos", icon: Package, path: "/products", section: "vendas" },
  { label: "Anúncios", icon: ShoppingBag, path: "/marketplace-ads", section: "vendas" },
  { label: "Painel Comercial", icon: BriefcaseBusiness, path: "/commercial", section: "vendas" },
  { label: "Biblioteca de Mídia", icon: Image, path: "/media", section: "conteudo" },
  { label: "Geração de Vídeos", icon: Film, path: "/videos", section: "conteudo" },
  { label: "Aprovação", icon: CheckSquare, path: "/approval", section: "conteudo", badgeKey: "approvals" },
  { label: "Agendamento", icon: Calendar, path: "/schedule", section: "conteudo", badgeKey: "scheduled" },
  { label: "Publicações", icon: Zap, path: "/publications", section: "conteudo", badgeKey: "failures" },
  { label: "Comentários", icon: MessageSquare, path: "/comments", section: "conteudo", badgeKey: "comments" },
  { label: "Integrações", icon: Link2, path: "/integrations", section: "operacao" },
  { label: "Relatórios", icon: BarChart2, path: "/reports", section: "operacao" },
];
