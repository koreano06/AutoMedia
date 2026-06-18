import { Link, useLocation } from "react-router-dom";
import { Settings, Zap, ChevronRight, X } from "lucide-react";
import { mainNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/lib/AuthContext";

type SidebarProps = {
  counts?: Record<string, number>;
  open?: boolean;
  onNavigate?: () => void;
};

export default function Sidebar({ counts = {}, open = false, onNavigate }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  let currentSection = "";

  const sectionLabels = {
    principal: "Principal",
    vendas: "Anúncios base",
    conteudo: "Conteúdo e mídias",
    operacao: "Operação",
  };

  return (
    <aside
      className={cn(
        "automedia-sidebar fixed left-0 top-0 z-50 flex h-dvh w-[min(18rem,88vw)] flex-col border-r border-white/5 transition-transform duration-200 md:left-4 md:top-4 md:z-40 md:h-[calc(100dvh-2rem)] md:w-64 md:translate-x-0 md:rounded-[2rem] md:border md:border-white/10 md:shadow-2xl md:shadow-black/20 lg:left-5 lg:top-5 lg:h-[calc(100dvh-2.5rem)]",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="border-b border-white/10 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" onClick={onNavigate} className="flex items-center gap-3 rounded-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <p className="font-syne text-sm font-bold leading-tight text-white">AutoMedia</p>
              <p className="font-inter text-xs text-white/40">Marketing Automático</p>
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

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {mainNavigation.filter((item) => !item.permission || hasPermission(user?.role, item.permission)).map(({ label, icon: Icon, path, section, badgeKey }) => {
          const isActive = location.pathname === path;
          const badgeCount = badgeKey ? counts[badgeKey] || 0 : 0;
          const showSection = section !== currentSection;
          currentSection = section;

          return (
            <div key={path}>
              {showSection && (
                <p className="mb-2 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/28 first:mt-0">
                  {sectionLabels[section]}
                </p>
              )}
              <Link
                to={path}
                onClick={onNavigate}
                className={cn(
                  "group relative mb-1 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-white/55 hover:bg-white/8 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-white/40 group-hover:text-white/70")} />
                <span className="flex-1">{label}</span>
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      isActive ? "bg-white text-primary" : "bg-primary text-white"
                    )}
                  >
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
                {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
