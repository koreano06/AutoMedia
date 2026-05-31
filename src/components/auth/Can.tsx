import type { ReactNode } from "react";
import { type AppPermission, usePermission } from "@/lib/permissions";

type CanProps = {
  permission: AppPermission;
  children: ReactNode;
  fallback?: ReactNode;
};

export default function Can({ permission, children, fallback = null }: CanProps) {
  return usePermission(permission) ? children : fallback;
}
