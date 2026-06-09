import { useAuth } from "@/lib/AuthContext";

export type AppPermission =
  | "admin:access"
  | "platform:manage"
  | "post:publish"
  | "post:delete"
  | "product:delete"
  | "finance:manage"
  | "settings:manage"
  | "media:review"
  | "video:generate"
  | "quality:view";

const adminPermissions: AppPermission[] = [
  "admin:access",
  "platform:manage",
  "post:publish",
  "post:delete",
  "product:delete",
  "finance:manage",
  "settings:manage",
  "media:review",
  "video:generate",
  "quality:view",
];

const rolePermissions: Record<string, AppPermission[]> = {
  admin: adminPermissions,
  operator: ["post:publish", "media:review", "video:generate", "quality:view"],
  reviewer: ["media:review", "quality:view"],
  finance: ["finance:manage", "quality:view"],
  user: ["video:generate"],
  viewer: ["quality:view"],
};

export const roleProfiles: Record<string, { label: string; description: string }> = {
  admin: { label: "Administrador", description: "Acesso total a configuração, integrações, finanças e publicação." },
  operator: { label: "Operador", description: "Gera vídeos, revisa mídias e publica campanhas aprovadas." },
  reviewer: { label: "Revisor", description: "Revisa ativos, aprova mídia e acompanha qualidade." },
  finance: { label: "Financeiro", description: "Acompanha relatórios e dados financeiros." },
  user: { label: "Criador", description: "Cria roteiros e vídeos, sem permissões sensíveis." },
  viewer: { label: "Leitor", description: "Acompanha painéis sem alterar dados críticos." },
};

export function hasPermission(role: string | undefined, permission: AppPermission) {
  return rolePermissions[role || ""]?.includes(permission) || false;
}

export function getRoleProfile(role: string | undefined) {
  return roleProfiles[role || ""] || roleProfiles.viewer;
}

export function usePermission(permission: AppPermission) {
  const { user } = useAuth();
  return hasPermission(user?.role, permission);
}
