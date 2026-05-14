import { Link, useLocation } from "react-router-dom";
import { Settings, Zap, ChevronRight, X } from "lucide-react";
import { mainNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

type SidebarProps = {
  counts?: Record<string, number>;
  open?: boolean;
  onNavigate?: () => void;
};

export default function Sidebar({ counts = {}, open = false, onNavigate }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "sidebar-bg fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[82vw] flex-col border-r border-white/5 transition-transform duration-200 md:z-40 md:w-64 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" onClick={onNavigate} className="flex items-center gap-3 rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <p className="font-syne font-700 text-white text-sm leading-tight">AutoMedia</p>
              <p className="text-xs text-white/30 font-inter">Marketing Automático</p>
            </div>
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white md:hidden"
            onClick={onNavigate}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-3 mb-3">Menu Principal</p>
        {mainNavigation.map(({ label, icon: Icon, path, badgeKey }) => {
          const isActive = location.pathname === path;
          const badgeCount = badgeKey ? counts[badgeKey] || 0 : 0;
          return (
            <Link
              key={path}
              to={path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative",
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-white/40 group-hover:text-white/70")} />
              <span className="flex-1">{label}</span>
              {badgeCount > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center",
                    isActive ? "bg-white text-primary" : "bg-primary text-white"
                  )}
                >
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/5">
        <Link
          to="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            location.pathname === "/settings"
              ? "bg-primary text-white"
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </Link>
      </div>
    </aside>
  );
}
