import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { type AppPermission, usePermission } from "@/lib/permissions";

type RequirePermissionProps = {
  permission: AppPermission;
  children: ReactNode;
};

export default function RequirePermission({ permission, children }: RequirePermissionProps) {
  const allowed = usePermission(permission);

  if (allowed) return children;

  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-6">
      <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <p className="font-syne text-lg font-bold text-foreground">Acesso restrito</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Esta área exige permissão de administrador. Se você precisa usar esta função, peça acesso ao responsável pela conta.
        </p>
      </div>
    </div>
  );
}
