import { Link, useLocation } from "react-router-dom";
import { Menu, Settings } from "lucide-react";
import { mainNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  counts?: Record<string, number>;
  onOpenMenu: () => void;
};

const primaryItems = mainNavigation.slice(0, 5);
const secondaryItems = mainNavigation.slice(5);

export default function MobileBottomNav({ counts = {}, onOpenMenu }: MobileBottomNavProps) {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 px-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden">
      <div className="scrollbar-none flex gap-1 overflow-x-auto">
        {primaryItems.map(({ label, icon: Icon, path, badgeKey }) => {
          const active = location.pathname === path;
          const badgeCount = badgeKey ? counts[badgeKey] || 0 : 0;

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "relative flex min-w-[4.4rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{label.replace("Biblioteca de Mídia", "Mídias").replace("Geração de Vídeos", "Vídeos")}</span>
              {badgeCount > 0 && (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-w-[4.4rem] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-4 w-4" />
          Mais
        </button>

        {secondaryItems.map(({ label, icon: Icon, path, badgeKey }) => {
          const active = location.pathname === path;
          const badgeCount = badgeKey ? counts[badgeKey] || 0 : 0;

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "relative flex min-w-[4.4rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{label}</span>
              {badgeCount > 0 && (
                <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}

        <Link
          to="/settings"
          className={cn(
            "flex min-w-[4.4rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold transition-colors",
            location.pathname === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Ajustes
        </Link>
      </div>
    </nav>
  );
}
