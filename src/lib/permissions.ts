import { useAuth } from "@/lib/AuthContext";

export type AppPermission =
  | "admin:access"
  | "platform:manage"
  | "post:publish"
  | "post:delete"
  | "product:delete"
  | "finance:manage"
  | "settings:manage";

const adminPermissions: AppPermission[] = [
  "admin:access",
  "platform:manage",
  "post:publish",
  "post:delete",
  "product:delete",
  "finance:manage",
  "settings:manage",
];

export function hasPermission(role: string | undefined, permission: AppPermission) {
  if (role === "admin") return adminPermissions.includes(permission);
  return false;
}

export function usePermission(permission: AppPermission) {
  const { user } = useAuth();
  return hasPermission(user?.role, permission);
}
