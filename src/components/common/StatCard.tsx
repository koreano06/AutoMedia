import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "primary" | "success" | "warning" | "destructive" | "blue" | "purple";
  loading?: boolean;
};

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = "primary", loading }: StatCardProps) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10", colorMap[color])}>
          {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
        </div>
        {trendValue !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend === "up" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 bg-muted rounded animate-pulse w-24" />
          <div className="h-4 bg-muted rounded animate-pulse w-36" />
        </div>
      ) : (
        <>
          <p className="font-syne text-xl font-bold text-foreground sm:text-2xl">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground/70 mt-1">{subtitle}</p>}
        </>
      )}
    </div>
  );
}
